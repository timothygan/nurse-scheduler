import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'

// POST - Approve a schedule
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    
    if (user.role !== 'SCHEDULER') {
      return NextResponse.json({ error: 'Only schedulers can approve schedules' }, { status: 403 })
    }

    const { id: scheduleId } = await params
    const body = await request.json()
    const { action, reason } = body // action: 'APPROVE' | 'ACTIVATE'

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    if (!action || !['APPROVE', 'ACTIVATE'].includes(action)) {
      return NextResponse.json({ error: 'Valid action (APPROVE or ACTIVATE) is required' }, { status: 400 })
    }

    // Verify schedule exists and belongs to same hospital
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        schedulingBlock: {
          hospitalId: user.hospitalId
        }
      },
      include: {
        schedulingBlock: true
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    let newStatus: 'DRAFT' | 'APPROVED' | 'ACTIVE'
    const updateData: any = {
      updatedAt: new Date()
    }

    if (action === 'APPROVE') {
      // Approve the schedule
      if (schedule.status !== 'DRAFT') {
        return NextResponse.json({ error: 'Only draft schedules can be approved' }, { status: 400 })
      }
      
      newStatus = 'APPROVED'
      updateData.status = 'APPROVED'
      updateData.approvedById = user.id
      updateData.approvedAt = new Date()
      
    } else if (action === 'ACTIVATE') {
      // Activate the schedule (must be approved first)
      if (schedule.status !== 'APPROVED') {
        return NextResponse.json({ error: 'Only approved schedules can be activated' }, { status: 400 })
      }

      // Deactivate any other active schedules for this scheduling block
      await prisma.schedule.updateMany({
        where: {
          schedulingBlockId: schedule.schedulingBlockId,
          status: 'ACTIVE'
        },
        data: {
          status: 'APPROVED', // Move back to approved
          updatedAt: new Date()
        }
      })

      newStatus = 'ACTIVE'
      updateData.status = 'ACTIVE'
    }

    // Update the schedule
    const updatedSchedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: updateData,
      include: {
        schedulingBlock: {
          select: { name: true }
        }
      }
    })

    return NextResponse.json({ 
      message: `Schedule ${action.toLowerCase()}d successfully`,
      schedule: {
        id: updatedSchedule.id,
        status: updatedSchedule.status,
        approvedAt: updatedSchedule.approvedAt?.toISOString(),
        schedulingBlockName: updatedSchedule.schedulingBlock.name
      }
    })

  } catch (error) {
    console.error('Error processing schedule approval:', error)
    return NextResponse.json(
      { error: 'Failed to process schedule approval' },
      { status: 500 }
    )
  }
}

// DELETE - Reject/revert a schedule to draft
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    
    if (user.role !== 'SCHEDULER') {
      return NextResponse.json({ error: 'Only schedulers can reject schedules' }, { status: 403 })
    }

    const { id: scheduleId } = await params
    const body = await request.json()
    const { reason } = body

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    // Verify schedule exists and belongs to same hospital
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        schedulingBlock: {
          hospitalId: user.hospitalId
        }
      },
      include: {
        schedulingBlock: true
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    if (schedule.status === 'DRAFT') {
      return NextResponse.json({ error: 'Schedule is already in draft status' }, { status: 400 })
    }

    // Revert to draft status
    const updatedSchedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        status: 'DRAFT',
        approvedById: null,
        approvedAt: null,
        updatedAt: new Date()
      },
      include: {
        schedulingBlock: {
          select: { name: true }
        }
      }
    })

    return NextResponse.json({ 
      message: 'Schedule reverted to draft successfully',
      schedule: {
        id: updatedSchedule.id,
        status: updatedSchedule.status,
        schedulingBlockName: updatedSchedule.schedulingBlock.name
      }
    })

  } catch (error) {
    console.error('Error rejecting schedule:', error)
    return NextResponse.json(
      { error: 'Failed to reject schedule' },
      { status: 500 }
    )
  }
}