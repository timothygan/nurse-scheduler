'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ProtectedRoute } from '@/components/ui/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar,
  CalendarDays,
  Clock,
  Sun,
  Moon,
  Download,
  RefreshCw,
  Star
} from 'lucide-react'
import { format, parseISO, eachDayOfInterval } from 'date-fns'
import Link from 'next/link'

interface NurseSchedule {
  schedulingBlock: {
    id: string
    name: string
    startDate: string
    endDate: string
    hospital: string
  }
  schedule: {
    id: string
    version: number
    status: 'APPROVED' | 'ACTIVE'
    optimizationScore: number
  }
  assignments: Array<{
    id: string
    date: string
    shiftType: 'DAY' | 'NIGHT'
    preferenceSatisfactionScore: number
  }>
  totalShifts: number
  averageSatisfaction: number
}

export default function NurseSchedulesPage() {
  const { data: session } = useSession()
  const [schedules, setSchedules] = useState<NurseSchedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!session?.user) return

      try {
        const response = await fetch('/api/nurse/schedules')
        if (response.ok) {
          const data = await response.json()
          setSchedules(data.schedules || [])
        } else {
          console.error('Failed to fetch schedules:', response.status)
        }
      } catch (error) {
        console.error('Error fetching schedules:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSchedules()
  }, [session])

  const refresh = async () => {
    setLoading(true)
    const response = await fetch('/api/nurse/schedules')
    if (response.ok) {
      const data = await response.json()
      setSchedules(data.schedules || [])
    }
    setLoading(false)
  }

  const handleExportSchedule = async (blockId?: string, format: 'csv' | 'json' = 'csv') => {
    try {
      const params = new URLSearchParams({ format })
      if (blockId) params.append('blockId', blockId)
      
      const response = await fetch(`/api/nurse/schedules/export?${params.toString()}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const contentDisposition = response.headers.get('Content-Disposition')
        const filename = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || `my_schedule.${format}`
        
        // Create download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        // Show success message
        const toast = (await import('sonner')).toast
        toast.success('Schedule exported successfully')
      } else {
        const errorData = await response.json()
        const toast = (await import('sonner')).toast
        toast.error(errorData.error || 'Failed to export schedule')
      }
    } catch (error) {
      console.error('Error exporting schedule:', error)
      const toast = (await import('sonner')).toast
      toast.error('Failed to export schedule')
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="NURSE">
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
              <p className="mt-4 text-gray-600">Loading your schedules...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="NURSE">
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Schedules</h1>
                <p className="mt-1 text-gray-600">View your approved and active work schedules</p>
              </div>
              <Button onClick={refresh} variant="outline" disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Schedules List */}
          {schedules.length > 0 ? (
            <div className="space-y-6">
              {schedules.map((item) => (
                <Card key={item.schedulingBlock.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          {item.schedulingBlock.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {format(parseISO(item.schedulingBlock.startDate), 'MMM d')} - {format(parseISO(item.schedulingBlock.endDate), 'MMM d, yyyy')}
                          <span className="mx-2">•</span>
                          {item.schedulingBlock.hospital}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.schedule.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {item.schedule.status}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleExportSchedule(item.schedulingBlock.id, 'csv')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <CalendarDays className="h-8 w-8 text-blue-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Shifts</p>
                            <p className="text-2xl font-bold text-blue-600">{item.totalShifts}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <Star className="h-8 w-8 text-yellow-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                            <p className="text-2xl font-bold text-yellow-600">
                              {(item.averageSatisfaction * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <Clock className="h-8 w-8 text-green-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Schedule Score</p>
                            <p className="text-2xl font-bold text-green-600">
                              {(item.schedule.optimizationScore * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Calendar View */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-medium mb-4 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Schedule Calendar
                      </h4>
                      
                      <div className="grid grid-cols-7 gap-2">
                        {/* Header row */}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                            {day}
                          </div>
                        ))}
                        
                        {/* Calendar days */}
                        {eachDayOfInterval({
                          start: parseISO(item.schedulingBlock.startDate),
                          end: parseISO(item.schedulingBlock.endDate)
                        }).map(date => {
                          const dateStr = format(date, 'yyyy-MM-dd')
                          const assignment = item.assignments.find(a => a.date === dateStr)
                          const isWeekend = date.getDay() === 0 || date.getDay() === 6
                          
                          return (
                            <div
                              key={dateStr}
                              className={`min-h-[60px] p-2 border rounded-lg transition-colors ${
                                isWeekend ? 'bg-gray-100' : 'bg-white'
                              } ${assignment ? 'border-blue-200' : 'border-gray-200'}`}
                            >
                              <div className="text-sm font-medium mb-1">
                                {format(date, 'd')}
                              </div>
                              
                              {assignment && (
                                <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                  assignment.shiftType === 'DAY'
                                    ? 'bg-yellow-200 text-yellow-800'
                                    : 'bg-blue-200 text-blue-800'
                                }`}>
                                  {assignment.shiftType === 'DAY' ? (
                                    <Sun className="h-3 w-3" />
                                  ) : (
                                    <Moon className="h-3 w-3" />
                                  )}
                                  <span className="font-medium">
                                    {assignment.shiftType}
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No active schedules</h3>
                <p className="mt-2 text-gray-600">
                  You don&apos;t have any approved or active schedules yet.
                </p>
                <div className="mt-4">
                  <Link href="/dashboard/nurse">
                    <Button variant="outline">
                      Back to Dashboard
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}