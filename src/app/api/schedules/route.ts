import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    if (session.user.role !== 'SCHEDULER') {
      return NextResponse.json({ error: 'Unauthorized - Only schedulers can view schedules' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const blockId = searchParams.get('blockId')

    if (!blockId) {
      return NextResponse.json({ error: 'blockId parameter is required' }, { status: 400 })
    }

    // Verify user has access to this scheduling block
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const schedulingBlock = await prisma.schedulingBlock.findUnique({
      where: { id: blockId },
      select: { hospitalId: true }
    })

    if (!schedulingBlock || user.hospitalId !== schedulingBlock.hospitalId) {
      return NextResponse.json({ error: 'Access denied to this scheduling block' }, { status: 403 })
    }

    // Fetch schedules for this block
    const schedules = await prisma.schedule.findMany({
      where: { schedulingBlockId: blockId },
      include: {
        shiftAssignments: {
          include: {
            nurse: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: [
        { optimizationScore: 'desc' },
        { version: 'asc' }
      ]
    })

    // Transform data for frontend
    const transformedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      version: schedule.version,
      optimizationScore: schedule.optimizationScore,
      // For now, we'll calculate these scores from optimization score
      // In a real implementation, these would be stored separately
      coverageScore: schedule.optimizationScore * 0.9, // Approximation
      preferenceScore: schedule.optimizationScore * 1.1, // Approximation
      fairnessScore: schedule.optimizationScore * 0.95, // Approximation
      seniorityScore: schedule.optimizationScore, // Approximation
      violations: [], // Would be stored in parameters or separate table
      statistics: {
        totalAssignments: schedule.shiftAssignments.length,
        nurseWorkloads: schedule.shiftAssignments.reduce((acc: Record<string, number>, assignment) => {
          acc[assignment.nurseId] = (acc[assignment.nurseId] || 0) + 1
          return acc
        }, {}),
        coverageMetrics: {
          totalRequired: 0, // Would need to calculate from scheduling rules
          totalFilled: schedule.shiftAssignments.length,
          coveragePercentage: schedule.optimizationScore
        },
        preferenceSatisfaction: schedule.shiftAssignments.reduce((acc: Record<string, number>, assignment) => {
          acc[assignment.nurseId] = assignment.preferenceSatisfactionScore
          return acc
        }, {})
      },
      assignments: schedule.shiftAssignments.map(assignment => ({
        id: assignment.id,
        nurseId: assignment.nurseId,
        nurseName: `${assignment.nurse.firstName} ${assignment.nurse.lastName}`,
        date: assignment.date.toISOString().split('T')[0],
        shiftType: assignment.shiftType,
        preferenceSatisfactionScore: assignment.preferenceSatisfactionScore
      })),
      createdAt: schedule.createdAt.toISOString(),
      status: schedule.status
    }))

    return NextResponse.json({
      success: true,
      schedules: transformedSchedules,
      count: transformedSchedules.length
    })

  } catch (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch schedules',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}