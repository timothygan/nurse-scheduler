import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'
import { SchedulingEngine, NurseData, SchedulingContext } from '@/lib/scheduling/engine'
import { SchedulingRules, DEFAULT_SCHEDULING_RULES } from '@/types/scheduling'

// Helper function to trigger schedule auto-generation
async function triggerScheduleGeneration(schedulingBlockId: string, hospitalId: string) {
  try {
    // Check if scheduling block is open for preference submission
    const schedulingBlock = await prisma.schedulingBlock.findUnique({
      where: { id: schedulingBlockId },
      include: {
        hospital: true,
        nursePreferences: {
          include: {
            nurse: {
              include: {
                nurseProfile: true
              }
            }
          }
        }
      }
    })

    if (!schedulingBlock || schedulingBlock.status !== 'OPEN') {
      console.log(`Skipping auto-generation for block ${schedulingBlockId}: not open`)
      return
    }

    // Only generate if we have at least one preference submitted
    if (schedulingBlock.nursePreferences.length === 0) {
      console.log(`Skipping auto-generation for block ${schedulingBlockId}: no preferences yet`)
      return
    }

    console.log(`Auto-generating schedules for block ${schedulingBlockId}`)

    // Delete existing draft schedules to replace with new ones
    await prisma.schedule.deleteMany({
      where: {
        schedulingBlockId: schedulingBlockId,
        status: 'DRAFT'
      }
    })

    // Prepare nurse data for scheduling engine
    const nurseData: NurseData[] = schedulingBlock.nursePreferences.map(pref => ({
      id: pref.nurse.id,
      name: pref.nurse.name,
      email: pref.nurse.email,
      seniority: pref.nurse.nurseProfile?.seniority || 1,
      shiftTypes: pref.nurse.nurseProfile?.shiftTypes as string[] || ['DAY', 'NIGHT'],
      qualifications: pref.nurse.nurseProfile?.qualifications as string[] || [],
      maxShiftsPerBlock: pref.nurse.nurseProfile?.maxShiftsPerBlock || 10,
      preferences: {
        preferredShifts: pref.preferredShifts as Record<string, string>,
        ptoRequests: pref.ptoRequests as string[],
        noScheduleRequests: pref.noScheduleRequests as string[],
        flexibilityScore: pref.flexibilityScore
      }
    }))

    const rules: SchedulingRules = schedulingBlock.rules as SchedulingRules || DEFAULT_SCHEDULING_RULES
    
    const context: SchedulingContext = {
      startDate: schedulingBlock.startDate,
      endDate: schedulingBlock.endDate,
      rules,
      nurseData,
      requiredCoverage: {}
    }

    const engine = new SchedulingEngine()
    const results = await engine.generateSchedules(
      context,
      3, // maxSchedules
      1000, // maxIterations
      'balanced' // optimizationStrategy
    )

    // Save generated schedules to database
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      
      const schedule = await prisma.schedule.create({
        data: {
          schedulingBlockId: schedulingBlockId,
          version: i + 1,
          status: 'DRAFT',
          optimizationScore: result.score,
          algorithmUsed: 'genetic',
          parameters: {
            maxIterations: 1000,
            optimizationStrategy: 'balanced'
          },
          generatedAt: new Date()
        }
      })

      // Create shift assignments
      for (const assignment of result.assignments) {
        await prisma.shiftAssignment.create({
          data: {
            scheduleId: schedule.id,
            nurseId: assignment.nurseId,
            date: new Date(assignment.date),
            shiftType: assignment.shiftType as any,
            requiredQualificationsMet: true,
            preferenceSatisfactionScore: assignment.preferenceSatisfactionScore || 0
          }
        })
      }
    }

    console.log(`Auto-generated ${results.length} schedules for block ${schedulingBlockId}`)
  } catch (error) {
    console.error(`Failed to auto-generate schedules for block ${schedulingBlockId}:`, error)
    // Don't throw error - auto-generation failure shouldn't fail preference submission
  }
}

// GET - Fetch nurse preferences for a specific scheduling block
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

    const { searchParams } = new URL(request.url)
    const blockId = searchParams.get('blockId')

    if (!blockId) {
      return NextResponse.json({ error: 'Scheduling block ID is required' }, { status: 400 })
    }

    // Fetch existing preferences for this nurse and scheduling block
    const preferences = await prisma.nursePreferences.findFirst({
      where: {
        nurseId: user.id,
        schedulingBlockId: blockId
      }
    })

    if (!preferences) {
      return NextResponse.json({ preferences: null })
    }

    // Transform the data for the frontend
    const transformedPreferences = {
      id: preferences.id,
      preferredShifts: preferences.preferredShifts as Record<string, string>,
      ptoRequests: preferences.ptoRequests as string[],
      noScheduleRequests: preferences.noScheduleRequests as string[],
      flexibilityScore: preferences.flexibilityScore,
      submittedAt: preferences.submittedAt?.toISOString()
    }

    return NextResponse.json({ preferences: transformedPreferences })

  } catch (error) {
    console.error('Error fetching nurse preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

// POST - Create new nurse preferences
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    
    if (user.role !== 'NURSE') {
      return NextResponse.json({ error: 'Only nurses can access this endpoint' }, { status: 403 })
    }

    const body = await request.json()
    const {
      schedulingBlockId,
      preferredShifts,
      ptoRequests,
      noScheduleRequests,
      flexibilityScore
    } = body

    // Validate required fields
    if (!schedulingBlockId) {
      return NextResponse.json({ error: 'Scheduling block ID is required' }, { status: 400 })
    }

    if (typeof flexibilityScore !== 'number' || flexibilityScore < 1 || flexibilityScore > 10) {
      return NextResponse.json({ error: 'Flexibility score must be between 1 and 10' }, { status: 400 })
    }

    // Verify scheduling block exists and is OPEN
    const schedulingBlock = await prisma.schedulingBlock.findFirst({
      where: {
        id: schedulingBlockId,
        hospitalId: user.hospitalId,
        status: 'OPEN'
      }
    })

    if (!schedulingBlock) {
      return NextResponse.json({ 
        error: 'Scheduling block not found or not available for preferences' 
      }, { status: 404 })
    }

    // Check if preferences already exist for this nurse/block combination
    const existingPreferences = await prisma.nursePreferences.findFirst({
      where: {
        nurseId: user.id,
        schedulingBlockId
      }
    })

    if (existingPreferences) {
      return NextResponse.json({ 
        error: 'Preferences already exist for this scheduling block. Use PUT to update.' 
      }, { status: 409 })
    }

    // Validate dates are within scheduling block range
    const blockStartDate = schedulingBlock.startDate
    const blockEndDate = schedulingBlock.endDate

    const allDates = [
      ...Object.keys(preferredShifts || {}),
      ...(ptoRequests || []),
      ...(noScheduleRequests || [])
    ]

    for (const dateStr of allDates) {
      const date = new Date(dateStr)
      if (date < blockStartDate || date > blockEndDate) {
        return NextResponse.json({
          error: `Date ${dateStr} is outside the scheduling block range`
        }, { status: 400 })
      }
    }

    // Create preferences
    const preferences = await prisma.nursePreferences.create({
      data: {
        nurseId: user.id,
        schedulingBlockId,
        preferredShifts: preferredShifts || {},
        ptoRequests: ptoRequests || [],
        noScheduleRequests: noScheduleRequests || [],
        flexibilityScore,
        submittedAt: new Date()
      }
    })

    // Trigger automatic schedule generation
    await triggerScheduleGeneration(schedulingBlockId, user.hospitalId)

    return NextResponse.json({ 
      message: 'Preferences created successfully',
      preferences: {
        id: preferences.id,
        submittedAt: preferences.submittedAt?.toISOString()
      }
    })

  } catch (error) {
    console.error('Error creating nurse preferences:', error)
    return NextResponse.json(
      { error: 'Failed to create preferences' },
      { status: 500 }
    )
  }
}

// PUT - Update existing nurse preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    
    if (user.role !== 'NURSE') {
      return NextResponse.json({ error: 'Only nurses can access this endpoint' }, { status: 403 })
    }

    const body = await request.json()
    const {
      id,
      schedulingBlockId,
      preferredShifts,
      ptoRequests,
      noScheduleRequests,
      flexibilityScore
    } = body

    // Validate required fields
    if (!schedulingBlockId) {
      return NextResponse.json({ error: 'Scheduling block ID is required' }, { status: 400 })
    }

    if (typeof flexibilityScore !== 'number' || flexibilityScore < 1 || flexibilityScore > 10) {
      return NextResponse.json({ error: 'Flexibility score must be between 1 and 10' }, { status: 400 })
    }

    // Find existing preferences
    const existingPreferences = await prisma.nursePreferences.findFirst({
      where: {
        nurseId: user.id,
        schedulingBlockId
      },
      include: {
        schedulingBlock: true
      }
    })

    if (!existingPreferences) {
      return NextResponse.json({ 
        error: 'Preferences not found. Use POST to create new preferences.' 
      }, { status: 404 })
    }

    // Verify scheduling block is still OPEN
    if (existingPreferences.schedulingBlock.status !== 'OPEN') {
      return NextResponse.json({ 
        error: 'Cannot update preferences. Scheduling block is no longer open.' 
      }, { status: 403 })
    }

    // Validate dates are within scheduling block range
    const blockStartDate = existingPreferences.schedulingBlock.startDate
    const blockEndDate = existingPreferences.schedulingBlock.endDate

    const allDates = [
      ...Object.keys(preferredShifts || {}),
      ...(ptoRequests || []),
      ...(noScheduleRequests || [])
    ]

    for (const dateStr of allDates) {
      const date = new Date(dateStr)
      if (date < blockStartDate || date > blockEndDate) {
        return NextResponse.json({
          error: `Date ${dateStr} is outside the scheduling block range`
        }, { status: 400 })
      }
    }

    // Update preferences
    const updatedPreferences = await prisma.nursePreferences.update({
      where: {
        id: existingPreferences.id
      },
      data: {
        preferredShifts: preferredShifts || {},
        ptoRequests: ptoRequests || [],
        noScheduleRequests: noScheduleRequests || [],
        flexibilityScore,
        submittedAt: new Date() // Update submission timestamp
      }
    })

    // Trigger automatic schedule regeneration
    await triggerScheduleGeneration(schedulingBlockId, user.hospitalId)

    return NextResponse.json({ 
      message: 'Preferences updated successfully',
      preferences: {
        id: updatedPreferences.id,
        submittedAt: updatedPreferences.submittedAt?.toISOString()
      }
    })

  } catch (error) {
    console.error('Error updating nurse preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}