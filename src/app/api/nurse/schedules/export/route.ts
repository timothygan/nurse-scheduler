import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'

// GET - Export nurse's personal schedules
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
    const exportFormat = searchParams.get('format') || 'csv'
    const blockId = searchParams.get('blockId') || null

    // Fetch nurse's shift assignments
    const assignments = await prisma.shiftAssignment.findMany({
      where: {
        nurseId: user.id,
        schedule: {
          status: { in: ['APPROVED', 'ACTIVE'] },
          ...(blockId ? { schedulingBlockId: blockId } : {})
        }
      },
      include: {
        schedule: {
          include: {
            schedulingBlock: {
              include: {
                hospital: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { shiftType: 'asc' }
      ]
    })

    if (assignments.length === 0) {
      return NextResponse.json({ error: 'No schedule assignments found' }, { status: 404 })
    }

    // Get nurse profile information
    const nurseProfile = await prisma.nurseProfile.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: { firstName: true, lastName: true }
        }
      }
    })

    // Prepare export data
    const exportData = {
      nurse: {
        name: `${user.firstName} ${user.lastName}`,
        employeeId: nurseProfile?.employeeId || 'N/A',
        seniorityLevel: nurseProfile?.seniorityLevel || 0,
        contractHours: nurseProfile?.contractHoursPerWeek || 0,
        qualifications: nurseProfile?.qualifications || []
      },
      assignments: assignments.map(assignment => ({
        date: assignment.date.toISOString().split('T')[0],
        dayOfWeek: format(assignment.date, 'EEEE'),
        shiftType: assignment.shiftType,
        schedulingBlock: assignment.schedule.schedulingBlock.name,
        hospital: assignment.schedule.schedulingBlock.hospital.name,
        scheduleStatus: assignment.schedule.status,
        scheduleVersion: assignment.schedule.version,
        preferenceSatisfaction: Math.round(assignment.preferenceSatisfactionScore * 100),
        blockStartDate: assignment.schedule.schedulingBlock.startDate.toISOString().split('T')[0],
        blockEndDate: assignment.schedule.schedulingBlock.endDate.toISOString().split('T')[0]
      })),
      summary: {
        totalShifts: assignments.length,
        dayShifts: assignments.filter(a => a.shiftType === 'DAY').length,
        nightShifts: assignments.filter(a => a.shiftType === 'NIGHT').length,
        averageSatisfaction: assignments.length > 0 
          ? Math.round((assignments.reduce((sum, a) => sum + a.preferenceSatisfactionScore, 0) / assignments.length) * 100)
          : 0,
        schedulingBlocks: [...new Set(assignments.map(a => a.schedule.schedulingBlock.name))]
      },
      exportInfo: {
        generatedAt: new Date().toISOString(),
        format: exportFormat,
        scope: 'nurse-personal'
      }
    }

    // Generate filename
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm')
    const nurseName = exportData.nurse.name.replace(/[^a-zA-Z0-9]/g, '-')
    const filename = `my-schedule_${nurseName}_${timestamp}`

    // Return data based on format
    switch (exportFormat.toLowerCase()) {
      case 'json':
        return new NextResponse(JSON.stringify(exportData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}.json"`
          }
        })

      case 'csv':
        const csvContent = generateNurseCSV(exportData)
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}.csv"`
          }
        })

      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error exporting nurse schedule:', error)
    return NextResponse.json(
      { error: 'Failed to export schedule' },
      { status: 500 }
    )
  }
}

function generateNurseCSV(data: any): string {
  const headers = [
    'Date',
    'Day of Week',
    'Shift Type', 
    'Scheduling Block',
    'Hospital',
    'Schedule Status',
    'Schedule Version',
    'Preference Satisfaction %',
    'Block Start Date',
    'Block End Date'
  ]
  
  const rows = data.assignments.map((assignment: any) => [
    assignment.date,
    assignment.dayOfWeek,
    assignment.shiftType,
    assignment.schedulingBlock,
    assignment.hospital,
    assignment.scheduleStatus,
    assignment.scheduleVersion.toString(),
    assignment.preferenceSatisfaction.toString(),
    assignment.blockStartDate,
    assignment.blockEndDate
  ])
  
  // Add header with nurse info
  const headerInfo = [
    ['Personal Schedule Export'],
    [''],
    ['Nurse Information:'],
    ['Name:', data.nurse.name],
    ['Employee ID:', data.nurse.employeeId],
    ['Seniority Level:', data.nurse.seniorityLevel.toString()],
    ['Contract Hours/Week:', data.nurse.contractHours.toString()],
    ['Qualifications:', Array.isArray(data.nurse.qualifications) ? data.nurse.qualifications.join(', ') : 'N/A'],
    [''],
    ['Summary:'],
    ['Total Shifts:', data.summary.totalShifts.toString()],
    ['Day Shifts:', data.summary.dayShifts.toString()],
    ['Night Shifts:', data.summary.nightShifts.toString()],
    ['Average Satisfaction:', `${data.summary.averageSatisfaction}%`],
    ['Scheduling Blocks:', data.summary.schedulingBlocks.join(', ')],
    [''],
    ['Exported:', data.exportInfo.generatedAt],
    [''],
    ['Schedule Details:']
  ]
  
  // Combine header info, column headers, and data
  const allRows = [
    ...headerInfo,
    headers,
    ...rows
  ]
  
  return allRows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')
}