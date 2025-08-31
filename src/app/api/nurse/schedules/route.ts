import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'

// GET - Fetch active/approved schedules for the logged-in nurse
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    
    if (user.role !== 'NURSE') {
      return NextResponse.json({ error: 'Only nurses can access this endpoint' }, { status: 403 })
    }

    // Fetch the nurse's shift assignments from active/approved schedules
    const assignments = await prisma.shiftAssignment.findMany({
      where: {
        nurseId: user.id,
        schedule: {
          status: {
            in: ['APPROVED', 'ACTIVE']
          }
        }
      },
      include: {
        schedule: {
          include: {
            schedulingBlock: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                hospital: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Group assignments by scheduling block
    const schedulesByBlock = assignments.reduce((acc: any, assignment) => {
      const blockId = assignment.schedule.schedulingBlock.id
      
      if (!acc[blockId]) {
        acc[blockId] = {
          schedulingBlock: assignment.schedule.schedulingBlock,
          schedule: {
            id: assignment.schedule.id,
            version: assignment.schedule.version,
            status: assignment.schedule.status,
            optimizationScore: assignment.schedule.optimizationScore
          },
          assignments: []
        }
      }
      
      acc[blockId].assignments.push({
        id: assignment.id,
        date: assignment.date.toISOString().split('T')[0],
        shiftType: assignment.shiftType,
        preferenceSatisfactionScore: assignment.preferenceSatisfactionScore
      })
      
      return acc
    }, {})

    // Convert to array format
    const schedules = Object.values(schedulesByBlock).map((item: any) => ({
      schedulingBlock: {
        ...item.schedulingBlock,
        startDate: item.schedulingBlock.startDate.toISOString(),
        endDate: item.schedulingBlock.endDate.toISOString(),
        hospital: item.schedulingBlock.hospital.name
      },
      schedule: item.schedule,
      assignments: item.assignments,
      totalShifts: item.assignments.length,
      averageSatisfaction: item.assignments.reduce((sum: number, a: any) => sum + a.preferenceSatisfactionScore, 0) / item.assignments.length
    }))

    return NextResponse.json({ schedules })

  } catch (error) {
    console.error('Error fetching nurse schedules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    )
  }
}