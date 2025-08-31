import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'
import { SchedulingBlockStatus } from '@/generated/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only schedulers can change block status
    if (session.user.role !== 'SCHEDULER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { status } = await request.json()
    const blockId = params.id

    // Validate status
    const validStatuses: SchedulingBlockStatus[] = ['DRAFT', 'OPEN', 'LOCKED', 'COMPLETED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get current block to validate ownership and current status
    const block = await prisma.schedulingBlock.findUnique({
      where: { id: blockId },
      include: {
        createdBy: true,
        hospital: true
      }
    })

    if (!block) {
      return NextResponse.json({ error: 'Scheduling block not found' }, { status: 404 })
    }

    // Check if user belongs to the same hospital
    if (block.hospital.id !== session.user.hospitalId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate status transition (business logic)
    const currentStatus = block.status
    const isValidTransition = validateStatusTransition(currentStatus, status)
    
    if (!isValidTransition) {
      return NextResponse.json({ 
        error: `Invalid status transition from ${currentStatus} to ${status}` 
      }, { status: 400 })
    }

    // Update block status
    const updatedBlock = await prisma.schedulingBlock.update({
      where: { id: blockId },
      data: {
        status: status,
        updatedAt: new Date()
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
      }
    })

    return NextResponse.json({
      message: `Block status updated to ${status}`,
      block: updatedBlock
    })

  } catch (error) {
    console.error('Status update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Business logic for valid status transitions
function validateStatusTransition(
  currentStatus: SchedulingBlockStatus, 
  newStatus: SchedulingBlockStatus
): boolean {
  const transitions: Record<SchedulingBlockStatus, SchedulingBlockStatus[]> = {
    DRAFT: ['OPEN', 'COMPLETED'], // Can open for preferences or cancel
    OPEN: ['LOCKED', 'DRAFT'], // Can lock for scheduling or revert to draft
    LOCKED: ['COMPLETED', 'OPEN'], // Can complete or reopen for changes
    COMPLETED: ['OPEN'] // Can reopen if needed
  }

  return transitions[currentStatus]?.includes(newStatus) || false
}