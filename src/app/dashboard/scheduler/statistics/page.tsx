'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/ui/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react'

interface Statistics {
  coverageRate: number
  activeBlocks: number
  totalNurses: number
  pendingSchedules: number
  approvedSchedules: number
  totalShifts: number
  averageShiftsPerNurse: number
  seniorityDistribution: {
    junior: number
    midLevel: number
    senior: number
    lead: number
    principal: number
  }
  blockStatuses: {
    draft: number
    approved: number
    active: number
    completed: number
  }
  recentActivity: {
    type: string
    message: string
    timestamp: string
  }[]
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    try {
      // Fetch dashboard stats
      const statsResponse = await fetch('/api/dashboard/stats')
      const dashboardStats = await statsResponse.json()

      // Fetch additional detailed statistics
      const [nursesResponse, blocksResponse, schedulesResponse] = await Promise.all([
        fetch('/api/nurses'),
        fetch('/api/scheduling-blocks'),
        fetch('/api/schedules')
      ])

      const nurses = await nursesResponse.json()
      const blocks = await blocksResponse.json()
      const schedules = await schedulesResponse.json()

      // Calculate seniority distribution
      const seniorityDistribution = {
        junior: nurses.filter((n: any) => n.seniorityLevel === 1).length,
        midLevel: nurses.filter((n: any) => n.seniorityLevel === 2).length,
        senior: nurses.filter((n: any) => n.seniorityLevel === 3).length,
        lead: nurses.filter((n: any) => n.seniorityLevel === 4).length,
        principal: nurses.filter((n: any) => n.seniorityLevel === 5).length,
      }

      // Calculate block statuses
      const blockStatuses = {
        draft: blocks.filter((b: any) => b.status === 'DRAFT').length,
        approved: blocks.filter((b: any) => b.status === 'APPROVED').length,
        active: blocks.filter((b: any) => b.status === 'ACTIVE').length,
        completed: blocks.filter((b: any) => b.status === 'COMPLETED').length,
      }

      // Calculate total shifts and average
      const totalShifts = schedules.reduce((acc: number, schedule: any) => 
        acc + (schedule.shifts?.length || 0), 0
      )
      const averageShiftsPerNurse = nurses.length > 0 
        ? Math.round(totalShifts / nurses.length) 
        : 0

      // Mock recent activity (in real app, this would come from an activity log)
      const recentActivity = [
        { type: 'success', message: 'New schedule approved for Block #3', timestamp: '2 hours ago' },
        { type: 'info', message: '5 nurses updated their preferences', timestamp: '5 hours ago' },
        { type: 'warning', message: 'Coverage below threshold for next week', timestamp: '1 day ago' },
        { type: 'success', message: 'Schedule generation completed', timestamp: '2 days ago' },
      ]

      setStats({
        coverageRate: dashboardStats.coverageRate,
        activeBlocks: dashboardStats.activeBlocks,
        totalNurses: dashboardStats.totalNurses,
        pendingSchedules: dashboardStats.pendingSchedules,
        approvedSchedules: schedules.filter((s: any) => s.status === 'APPROVED').length,
        totalShifts,
        averageShiftsPerNurse,
        seniorityDistribution,
        blockStatuses,
        recentActivity
      })
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="SCHEDULER">
        <DashboardLayout>
          <div className="flex justify-center items-center h-96">
            <div className="text-gray-500">Loading statistics...</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!stats) {
    return (
      <ProtectedRoute requiredRole="SCHEDULER">
        <DashboardLayout>
          <div className="flex justify-center items-center h-96">
            <div className="text-gray-500">Failed to load statistics</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  const getCoverageColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600'
    if (rate >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCoverageBg = (rate: number) => {
    if (rate >= 90) return 'bg-green-100'
    if (rate >= 70) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <ProtectedRoute requiredRole="SCHEDULER">
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Statistics & Analytics</h1>
            <p className="mt-1 text-sm text-gray-600">
              Comprehensive overview of scheduling performance and metrics
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Coverage Rate</p>
                    <p className={`text-3xl font-bold ${getCoverageColor(stats.coverageRate)}`}>
                      {stats.coverageRate}%
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${getCoverageBg(stats.coverageRate)}`}>
                    {stats.coverageRate >= 90 ? (
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                </div>
                <Progress value={stats.coverageRate} className="mt-3" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Blocks</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.activeBlocks}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Currently in progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Shifts</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalShifts}</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Avg {stats.averageShiftsPerNurse} per nurse</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Nurses</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalNurses}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Active staff members</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Statistics */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
            {/* Seniority Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Staff Seniority Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown of nurses by experience level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Junior</span>
                      <span className="text-sm text-gray-600">{stats.seniorityDistribution.junior}</span>
                    </div>
                    <Progress 
                      value={(stats.seniorityDistribution.junior / stats.totalNurses) * 100} 
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Mid-Level</span>
                      <span className="text-sm text-gray-600">{stats.seniorityDistribution.midLevel}</span>
                    </div>
                    <Progress 
                      value={(stats.seniorityDistribution.midLevel / stats.totalNurses) * 100} 
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Senior</span>
                      <span className="text-sm text-gray-600">{stats.seniorityDistribution.senior}</span>
                    </div>
                    <Progress 
                      value={(stats.seniorityDistribution.senior / stats.totalNurses) * 100} 
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Lead</span>
                      <span className="text-sm text-gray-600">{stats.seniorityDistribution.lead}</span>
                    </div>
                    <Progress 
                      value={(stats.seniorityDistribution.lead / stats.totalNurses) * 100} 
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Principal</span>
                      <span className="text-sm text-gray-600">{stats.seniorityDistribution.principal}</span>
                    </div>
                    <Progress 
                      value={(stats.seniorityDistribution.principal / stats.totalNurses) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Block Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Scheduling Block Status
                </CardTitle>
                <CardDescription>
                  Current status of all scheduling blocks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{stats.blockStatuses.draft}</div>
                    <div className="text-sm text-gray-500 mt-1">Draft</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.blockStatuses.approved}</div>
                    <div className="text-sm text-gray-500 mt-1">Approved</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.blockStatuses.active}</div>
                    <div className="text-sm text-gray-500 mt-1">Active</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{stats.blockStatuses.completed}</div>
                    <div className="text-sm text-gray-500 mt-1">Completed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest scheduling system events and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    {activity.type === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    )}
                    {activity.type === 'warning' && (
                      <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    )}
                    {activity.type === 'error' && (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    {activity.type === 'info' && (
                      <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}