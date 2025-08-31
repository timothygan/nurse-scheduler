import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'
import { SchedulingRules, DEFAULT_SCHEDULING_RULES } from '@/types/scheduling'

// GET - Fetch rules for a scheduling block
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email || session.user.role !== 'SCHEDULER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: blockId } = await params

    if (!blockId) {
      return NextResponse.json({ error: 'Block ID is required' }, { status: 400 })
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
      select: { 
        hospitalId: true, 
        rules: true, 
        name: true,
        status: true,
        startDate: true,
        endDate: true
      }
    })

    if (!schedulingBlock || user.hospitalId !== schedulingBlock.hospitalId) {
      return NextResponse.json({ error: 'Scheduling block not found or access denied' }, { status: 404 })
    }

    // Return rules (or defaults if none set)
    const rules = schedulingBlock.rules as SchedulingRules || DEFAULT_SCHEDULING_RULES

    return NextResponse.json({
      success: true,
      data: {
        blockId,
        blockName: schedulingBlock.name,
        blockStatus: schedulingBlock.status,
        blockDates: {
          startDate: schedulingBlock.startDate,
          endDate: schedulingBlock.endDate
        },
        rules
      }
    })

  } catch (error) {
    console.error('Error fetching scheduling rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduling rules' },
      { status: 500 }
    )
  }
}

// PUT - Update rules for a scheduling block
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email || session.user.role !== 'SCHEDULER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: blockId } = await params
    const body = await request.json()

    if (!blockId) {
      return NextResponse.json({ error: 'Block ID is required' }, { status: 400 })
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
      select: { hospitalId: true, status: true }
    })

    if (!schedulingBlock || user.hospitalId !== schedulingBlock.hospitalId) {
      return NextResponse.json({ error: 'Scheduling block not found or access denied' }, { status: 404 })
    }

    // Prevent rule changes for locked/completed blocks
    if (schedulingBlock.status === 'COMPLETED') {
      return NextResponse.json({ 
        error: 'Cannot modify rules for completed scheduling blocks' 
      }, { status: 400 })
    }

    const { rules } = body

    // Validate required rule fields
    const requiredFields = [
      'minShiftsPerNurse', 'maxShiftsPerNurse', 'minConsecutiveDays', 'maxConsecutiveDays',
      'maxPTOPerNurse', 'maxNoSchedulePerNurse', 'maxTotalTimeOff',
      'requiredCoverage', 'maxWeekendsPerNurse'
    ]

    for (const field of requiredFields) {
      if (rules[field] === undefined || rules[field] === null) {
        return NextResponse.json({ 
          error: `Missing required field: ${field}` 
        }, { status: 400 })
      }
    }

    // Basic validation
    if (rules.minShiftsPerNurse > rules.maxShiftsPerNurse) {
      return NextResponse.json({ 
        error: 'Minimum shifts per nurse cannot exceed maximum shifts per nurse' 
      }, { status: 400 })
    }

    if (rules.minConsecutiveDays > rules.maxConsecutiveDays) {
      return NextResponse.json({ 
        error: 'Minimum consecutive days cannot exceed maximum consecutive days' 
      }, { status: 400 })
    }

    if (rules.maxTotalTimeOff < Math.max(rules.maxPTOPerNurse, rules.maxNoSchedulePerNurse)) {
      return NextResponse.json({ 
        error: 'Maximum total time off must be at least as high as individual PTO or no-schedule limits' 
      }, { status: 400 })
    }

    // Update the scheduling block with new rules
    const updatedBlock = await prisma.schedulingBlock.update({
      where: { id: blockId },
      data: {
        rules: rules,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Scheduling rules updated successfully',
      data: {
        blockId,
        rules: updatedBlock.rules,
        updatedAt: updatedBlock.updatedAt
      }
    })

  } catch (error) {
    console.error('Error updating scheduling rules:', error)
    return NextResponse.json(
      { error: 'Failed to update scheduling rules' },
      { status: 500 }
    )
  }
}

// POST - Reset rules to defaults
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email || session.user.role !== 'SCHEDULER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: blockId } = await params

    if (!blockId) {
      return NextResponse.json({ error: 'Block ID is required' }, { status: 400 })
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
      select: { hospitalId: true, status: true }
    })

    if (!schedulingBlock || user.hospitalId !== schedulingBlock.hospitalId) {
      return NextResponse.json({ error: 'Scheduling block not found or access denied' }, { status: 404 })
    }

    // Reset to default rules
    const updatedBlock = await prisma.schedulingBlock.update({
      where: { id: blockId },
      data: {
        rules: DEFAULT_SCHEDULING_RULES,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Rules reset to defaults successfully',
      data: {
        blockId,
        rules: updatedBlock.rules,
        updatedAt: updatedBlock.updatedAt
      }
    })

  } catch (error) {
    console.error('Error resetting scheduling rules:', error)
    return NextResponse.json(
      { error: 'Failed to reset scheduling rules' },
      { status: 500 }
    )
  }
}