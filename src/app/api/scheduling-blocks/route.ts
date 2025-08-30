import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth/utils'
import { apiSuccess, apiError } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('SCHEDULER')
    const { searchParams } = new URL(request.url)
    const hospitalId = (user as any).hospitalId

    const schedulingBlocks = await prisma.schedulingBlock.findMany({
      where: {
        hospitalId
      },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            nursePreferences: true,
            schedules: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    })

    return apiSuccess(schedulingBlocks)
  } catch (error: any) {
    console.error('Failed to fetch scheduling blocks:', error)
    return apiError(error.message || 'Failed to fetch scheduling blocks', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('SCHEDULER')
    const body = await request.json()
    
    const {
      name,
      startDate,
      endDate,
      rules
    } = body

    if (!name || !startDate || !endDate) {
      return apiError('Name, start date, and end date are required')
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (start >= end) {
      return apiError('End date must be after start date')
    }

    // Check for overlapping scheduling blocks
    const overlapping = await prisma.schedulingBlock.findFirst({
      where: {
        hospitalId: (user as any).hospitalId,
        OR: [
          {
            startDate: {
              lte: end
            },
            endDate: {
              gte: start
            }
          }
        ]
      }
    })

    if (overlapping) {
      return apiError('Scheduling block overlaps with existing block')
    }

    const schedulingBlock = await prisma.schedulingBlock.create({
      data: {
        name,
        startDate: start,
        endDate: end,
        rules: rules || {},
        hospitalId: (user as any).hospitalId,
        createdById: user.id!
      },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return apiSuccess(schedulingBlock, 'Scheduling block created successfully')
  } catch (error: any) {
    console.error('Failed to create scheduling block:', error)
    return apiError(error.message || 'Failed to create scheduling block', 500)
  }
}