import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'

// GET - Fetch all nurse preferences for a scheduling block (Scheduler only)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    
    if (user.role !== 'SCHEDULER') {
      return NextResponse.json({ error: 'Only schedulers can access this endpoint' }, { status: 403 })
    }

    const { id: blockId } = await params

    if (!blockId) {
      return NextResponse.json({ error: 'Scheduling block ID is required' }, { status: 400 })
    }

    // Verify scheduling block exists and belongs to the same hospital
    const schedulingBlock = await prisma.schedulingBlock.findFirst({
      where: {
        id: blockId,
        hospitalId: user.hospitalId
      }
    })

    if (!schedulingBlock) {
      return NextResponse.json({ 
        error: 'Scheduling block not found' 
      }, { status: 404 })
    }

    // Fetch all nurse preferences for this scheduling block
    const preferences = await prisma.nursePreferences.findMany({
      where: {
        schedulingBlockId: blockId
      },
      include: {
        nurse: {
          include: {
            nurseProfile: true
          }
        }
      }
    })

    // Transform the data for the frontend
    const transformedPreferences: Record<string, any> = {}
    
    preferences.forEach(pref => {
      transformedPreferences[pref.nurseId] = {
        name: `${pref.nurse.firstName} ${pref.nurse.lastName}`,
        preferredShifts: pref.preferredShifts as Record<string, string>,
        ptoRequests: pref.ptoRequests as string[],
        noScheduleRequests: pref.noScheduleRequests as string[],
        flexibilityScore: pref.flexibilityScore,
        submittedAt: pref.submittedAt?.toISOString(),
        // Add nurse profile information
        seniorityLevel: pref.nurse.nurseProfile?.seniorityLevel || 0,
        contractHoursPerWeek: pref.nurse.nurseProfile?.contractHoursPerWeek || 40,
        maxShiftsPerBlock: pref.nurse.nurseProfile?.maxShiftsPerBlock || 15,
        shiftTypes: pref.nurse.nurseProfile?.shiftTypes ? 
          JSON.parse(pref.nurse.nurseProfile.shiftTypes as string) : ['DAY'],
        qualifications: pref.nurse.nurseProfile?.qualifications || ['RN'],
        ptoBalance: 80, // Mock PTO balance for now
        hireDate: pref.nurse.nurseProfile?.hireDate?.toISOString() || new Date().toISOString()
      }
    })

    return NextResponse.json({ preferences: transformedPreferences })

  } catch (error) {
    console.error('Error fetching nurse preferences for scheduling block:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}