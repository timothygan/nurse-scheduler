import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'
import { SchedulingEngine, NurseData, SchedulingContext } from '@/lib/scheduling/engine'
import { SchedulingRules, DEFAULT_SCHEDULING_RULES } from '@/types/scheduling'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    if (session.user.role !== 'SCHEDULER') {
      return NextResponse.json({ error: 'Unauthorized - Only schedulers can generate schedules' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      blockId, 
      maxSchedules = 3, 
      maxIterations = 1000, 
      optimizationStrategy = 'balanced' 
    } = body

    if (!blockId) {
      return NextResponse.json({ error: 'blockId is required' }, { status: 400 })
    }

    // Fetch scheduling block with all related data
    const schedulingBlock = await prisma.schedulingBlock.findUnique({
      where: { id: blockId },
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

    if (!schedulingBlock) {
      return NextResponse.json({ error: 'Scheduling block not found' }, { status: 404 })
    }

    // Verify user has access to this hospital
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || user.hospitalId !== schedulingBlock.hospitalId) {
      return NextResponse.json({ error: 'Access denied to this scheduling block' }, { status: 403 })
    }

    // Prepare nurse data for the scheduling engine
    const nurseData: NurseData[] = []
    
    for (const preference of schedulingBlock.nursePreferences) {
      const nurse = preference.nurse
      let nurseProfile = nurse.nurseProfile
      
      // Create default profile if none exists
      if (!nurseProfile) {
        nurseProfile = {
          id: `default-${nurse.id}`,
          userId: nurse.id,
          employeeId: nurse.id.slice(-6),
          hireDate: new Date(),
          seniorityLevel: 1,
          shiftTypes: '["DAY", "NIGHT"]',
          qualifications: ['RN'],
          contractHoursPerWeek: 40,
          maxShiftsPerBlock: 15,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }

      // Parse shift types (stored as JSON string in SQLite)
      let shiftTypes: ('DAY' | 'NIGHT')[]
      try {
        shiftTypes = typeof nurseProfile.shiftTypes === 'string' 
          ? JSON.parse(nurseProfile.shiftTypes) 
          : nurseProfile.shiftTypes
      } catch {
        shiftTypes = ['DAY', 'NIGHT']
      }

      // Parse preferences data
      const preferredShifts = typeof preference.preferredShifts === 'string'
        ? JSON.parse(preference.preferredShifts)
        : preference.preferredShifts || {}
      
      const ptoRequests = typeof preference.ptoRequests === 'string'
        ? JSON.parse(preference.ptoRequests)
        : preference.ptoRequests || []
      
      const noScheduleRequests = typeof preference.noScheduleRequests === 'string'
        ? JSON.parse(preference.noScheduleRequests)
        : preference.noScheduleRequests || []

      const nurseEntry: NurseData = {
        id: nurse.id,
        name: `${nurse.firstName} ${nurse.lastName}`,
        seniorityLevel: nurseProfile.seniorityLevel,
        shiftTypes,
        maxShiftsPerBlock: nurseProfile.maxShiftsPerBlock,
        contractHoursPerWeek: nurseProfile.contractHoursPerWeek,
        preferences: {
          preferredShifts,
          ptoRequests,
          noScheduleRequests,
          flexibilityScore: preference.flexibilityScore
        }
      }

      nurseData.push(nurseEntry)
    }

    if (nurseData.length === 0) {
      return NextResponse.json({ 
        error: 'No nurse preferences submitted for this scheduling block' 
      }, { status: 400 })
    }

    // Parse scheduling rules
    const rules: SchedulingRules = schedulingBlock.rules 
      ? (typeof schedulingBlock.rules === 'string' 
          ? JSON.parse(schedulingBlock.rules) 
          : schedulingBlock.rules)
      : DEFAULT_SCHEDULING_RULES

    // Create scheduling context
    const context: SchedulingContext = {
      startDate: schedulingBlock.startDate.toISOString().split('T')[0],
      endDate: schedulingBlock.endDate.toISOString().split('T')[0],
      nurses: nurseData,
      rules,
      requirements: [] // Will be initialized by the engine
    }

    // Generate schedules using the scheduling engine
    console.log(`🔄 Generating schedules for block: ${schedulingBlock.name}`)
    console.log(`👥 Nurses: ${nurseData.length}`)
    console.log(`📅 Period: ${context.startDate} to ${context.endDate}`)

    const engine = new SchedulingEngine(context)
    const generatedSchedules = await engine.generateSchedules({
      maxSchedules,
      maxIterations,
      optimizationStrategy: optimizationStrategy as 'balanced' | 'coverage' | 'preferences' | 'fairness'
    })

    if (generatedSchedules.length === 0) {
      return NextResponse.json({
        error: 'Unable to generate valid schedules with current constraints',
        message: 'Try relaxing some constraints or ensuring sufficient nurse availability'
      }, { status: 422 })
    }

    // Save generated schedules to database
    const savedSchedules = []
    
    for (const [index, schedule] of generatedSchedules.entries()) {
      try {
        const dbSchedule = await prisma.schedule.create({
          data: {
            schedulingBlockId: blockId,
            version: index + 1,
            algorithmUsed: 'constraint-satisfaction-v1',
            parameters: {
              maxSchedules,
              maxIterations,
              optimizationStrategy,
              nurseCount: nurseData.length,
              generatedAt: new Date().toISOString()
            },
            optimizationScore: schedule.optimizationScore,
            status: 'DRAFT',
            shiftAssignments: {
              create: schedule.assignments.map(assignment => ({
                nurseId: assignment.nurseId,
                date: new Date(assignment.date),
                shiftType: assignment.shiftType,
                requiredQualificationsMet: true,
                preferenceSatisfactionScore: calculatePreferenceSatisfactionForAssignment(
                  assignment, 
                  nurseData
                )
              }))
            }
          },
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
          }
        })

        savedSchedules.push({
          id: dbSchedule.id,
          version: dbSchedule.version,
          optimizationScore: schedule.optimizationScore,
          coverageScore: schedule.coverageScore,
          preferenceScore: schedule.preferenceScore,
          fairnessScore: schedule.fairnessScore,
          seniorityScore: schedule.seniorityScore,
          violations: schedule.violations,
          statistics: schedule.statistics,
          assignments: dbSchedule.shiftAssignments.map(sa => ({
            id: sa.id,
            nurseId: sa.nurseId,
            nurseName: `${sa.nurse.firstName} ${sa.nurse.lastName}`,
            date: sa.date.toISOString().split('T')[0],
            shiftType: sa.shiftType,
            preferenceSatisfactionScore: sa.preferenceSatisfactionScore
          }))
        })

        console.log(`✅ Schedule ${index + 1} saved with ${schedule.assignments.length} assignments`)
      } catch (error) {
        console.error(`❌ Error saving schedule ${index + 1}:`, error)
      }
    }

    const response = {
      success: true,
      message: `Generated ${savedSchedules.length} schedule options`,
      schedules: savedSchedules,
      metadata: {
        blockId,
        blockName: schedulingBlock.name,
        period: `${context.startDate} to ${context.endDate}`,
        nurseCount: nurseData.length,
        generationTime: new Date().toISOString(),
        parameters: {
          maxSchedules,
          maxIterations,
          optimizationStrategy
        }
      }
    }

    console.log(`🎉 Successfully generated ${savedSchedules.length} schedules for ${schedulingBlock.name}`)
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error generating schedules:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate schedules',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to calculate preference satisfaction for individual assignments
function calculatePreferenceSatisfactionForAssignment(
  assignment: { nurseId: string; date: string; shiftType: 'DAY' | 'NIGHT' },
  nurseData: NurseData[]
): number {
  const nurse = nurseData.find(n => n.id === assignment.nurseId)
  if (!nurse?.preferences) return 0.5 // Neutral score if no preferences
  
  const preference = nurse.preferences.preferredShifts[assignment.date]
  if (!preference) return 0.5 // Neutral if no preference for this date
  
  if (preference === assignment.shiftType) return 1.0 // Perfect match
  if (preference === 'ANY') return 0.8 // Good match
  return 0.2 // Poor match (wanted different shift)
}