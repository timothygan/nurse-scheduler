import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'

// GET - Export schedule in various formats
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    const { id: scheduleId } = await params
    const { searchParams } = new URL(request.url)
    const exportFormat = searchParams.get('format') || 'csv' // csv, json, pdf
    const scope = searchParams.get('scope') || 'full' // full, nurse-only
    const nurseId = searchParams.get('nurseId') || null

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    // Verify access permissions
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        ...(user.role === 'NURSE' 
          ? { 
              status: { in: ['APPROVED', 'ACTIVE'] },
              shiftAssignments: { some: { nurseId: user.id } }
            }
          : {
              schedulingBlock: { hospitalId: user.hospitalId }
            }
        )
      },
      include: {
        schedulingBlock: {
          include: {
            hospital: { select: { name: true } },
            createdBy: { select: { firstName: true, lastName: true } }
          }
        },
        shiftAssignments: {
          where: scope === 'nurse-only' && nurseId ? { nurseId } : {},
          include: {
            nurse: {
              select: {
                firstName: true,
                lastName: true,
                nurseProfile: {
                  select: {
                    employeeId: true,
                    seniorityLevel: true
                  }
                }
              }
            }
          },
          orderBy: [
            { date: 'asc' },
            { shiftType: 'asc' }
          ]
        }
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found or access denied' }, { status: 404 })
    }

    // Prepare export data
    const exportData = {
      schedule: {
        id: schedule.id,
        version: schedule.version,
        status: schedule.status,
        optimizationScore: schedule.optimizationScore,
        generatedAt: schedule.generatedAt.toISOString(),
        approvedAt: schedule.approvedAt?.toISOString() || null
      },
      schedulingBlock: {
        name: schedule.schedulingBlock.name,
        startDate: schedule.schedulingBlock.startDate.toISOString().split('T')[0],
        endDate: schedule.schedulingBlock.endDate.toISOString().split('T')[0],
        hospital: schedule.schedulingBlock.hospital.name,
        createdBy: `${schedule.schedulingBlock.createdBy.firstName} ${schedule.schedulingBlock.createdBy.lastName}`
      },
      assignments: schedule.shiftAssignments.map(assignment => ({
        date: assignment.date.toISOString().split('T')[0],
        dayOfWeek: format(assignment.date, 'EEEE'),
        shiftType: assignment.shiftType,
        nurseName: `${assignment.nurse.firstName} ${assignment.nurse.lastName}`,
        employeeId: assignment.nurse.nurseProfile?.employeeId || 'N/A',
        seniorityLevel: assignment.nurse.nurseProfile?.seniorityLevel || 0,
        preferenceSatisfaction: Math.round(assignment.preferenceSatisfactionScore * 100)
      })),
      exportInfo: {
        generatedAt: new Date().toISOString(),
        generatedBy: `${user.firstName} ${user.lastName}`,
        scope,
        format: exportFormat
      }
    }

    // Generate filename
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm')
    const scopeStr = scope === 'nurse-only' && nurseId ? `_${exportData.assignments[0]?.nurseName?.replace(' ', '-')}` : ''
    const filename = `schedule_${schedule.schedulingBlock.name.replace(/[^a-zA-Z0-9]/g, '-')}_v${schedule.version}${scopeStr}_${timestamp}`

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
        const csvContent = generateCSV(exportData)
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
    console.error('Error exporting schedule:', error)
    return NextResponse.json(
      { error: 'Failed to export schedule' },
      { status: 500 }
    )
  }
}

function generateCSV(data: any): string {
  const headers = [
    'Date',
    'Day of Week', 
    'Shift Type',
    'Nurse Name',
    'Employee ID',
    'Seniority Level',
    'Preference Satisfaction %'
  ]
  
  const rows = data.assignments.map((assignment: any) => [
    assignment.date,
    assignment.dayOfWeek,
    assignment.shiftType,
    assignment.nurseName,
    assignment.employeeId,
    assignment.seniorityLevel.toString(),
    assignment.preferenceSatisfaction.toString()
  ])
  
  // Add header with schedule info
  const headerInfo = [
    ['Schedule Export'],
    [''],
    ['Schedule Information:'],
    ['Hospital:', data.schedulingBlock.hospital],
    ['Scheduling Block:', data.schedulingBlock.name],
    ['Period:', `${data.schedulingBlock.startDate} to ${data.schedulingBlock.endDate}`],
    ['Status:', data.schedule.status],
    ['Version:', data.schedule.version.toString()],
    ['Optimization Score:', `${(data.schedule.optimizationScore * 100).toFixed(1)}%`],
    ['Generated:', data.schedule.generatedAt],
    ['Exported:', data.exportInfo.generatedAt],
    ['Exported By:', data.exportInfo.generatedBy],
    [''],
    ['Assignments:']
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