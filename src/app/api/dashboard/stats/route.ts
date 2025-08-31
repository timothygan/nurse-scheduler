import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SCHEDULER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active blocks count
    const activeBlocksCount = await prisma.schedulingBlock.count({
      where: {
        OR: [
          { status: 'ACTIVE' },
          {
            status: 'APPROVED',
            startDate: { lte: new Date() },
            endDate: { gte: new Date() }
          }
        ]
      }
    })

    // Get total nurses count
    const totalNursesCount = await prisma.nurse.count()

    // Get pending schedules count (DRAFT status)
    const pendingSchedulesCount = await prisma.schedule.count({
      where: {
        status: 'DRAFT'
      }
    })

    // Calculate coverage rate
    // Get active or current scheduling blocks
    const currentBlocks = await prisma.schedulingBlock.findMany({
      where: {
        OR: [
          { status: 'ACTIVE' },
          {
            status: 'APPROVED',
            startDate: { lte: new Date() },
            endDate: { gte: new Date() }
          }
        ]
      },
      include: {
        schedules: {
          where: {
            OR: [
              { status: 'ACTIVE' },
              { status: 'APPROVED' }
            ]
          },
          include: {
            shifts: true
          }
        }
      }
    })

    // Calculate coverage rate based on filled shifts vs required shifts
    let totalRequiredShifts = 0
    let totalFilledShifts = 0

    for (const block of currentBlocks) {
      // Estimate required shifts based on block duration and hospital requirements
      const blockDays = Math.ceil((block.endDate.getTime() - block.startDate.getTime()) / (1000 * 60 * 60 * 24))
      const shiftsPerDay = 3 // Assuming 3 shifts per day (day, evening, night)
      const nursesPerShift = block.hospitalRequirements?.minNursesPerShift || 5
      
      totalRequiredShifts += blockDays * shiftsPerDay * nursesPerShift

      // Count filled shifts
      for (const schedule of block.schedules) {
        totalFilledShifts += schedule.shifts.length
      }
    }

    const coverageRate = totalRequiredShifts > 0 
      ? Math.round((totalFilledShifts / totalRequiredShifts) * 100)
      : 0

    return NextResponse.json({
      activeBlocks: activeBlocksCount,
      totalNurses: totalNursesCount,
      pendingSchedules: pendingSchedulesCount,
      coverageRate: coverageRate
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}