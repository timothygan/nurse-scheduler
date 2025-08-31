'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/ui/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calendar as CalendarIcon, 
  Users, 
  ArrowLeft, 
  Play, 
  RefreshCw, 
  Download,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  Check,
  X,
  Power
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import Link from 'next/link'
import { ScheduleDetailsModal } from '@/components/scheduler/schedule-details-modal'

interface SchedulingBlock {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  hospital: string
  createdBy: string
  rules?: any
  _count: {
    nursePreferences: number
  }
}

interface GeneratedSchedule {
  id: string
  version: number
  optimizationScore: number
  coverageScore: number
  preferenceScore: number
  fairnessScore: number
  seniorityScore: number
  status: 'DRAFT' | 'APPROVED' | 'ACTIVE'
  approvedById?: string | null
  approvedAt?: string | null
  violations: string[]
  statistics: {
    totalAssignments: number
    nurseWorkloads: Record<string, number>
    coverageMetrics: Record<string, number>
    preferenceSatisfaction: Record<string, number>
  }
  assignments: Array<{
    id: string
    nurseId: string
    nurseName: string
    date: string
    shiftType: 'DAY' | 'NIGHT'
    preferenceSatisfactionScore: number
  }>
}

export default function SchedulingBlockDetailPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const blockId = params.id as string

  const [schedulingBlock, setSchedulingBlock] = useState<SchedulingBlock | null>(null)
  const [schedules, setSchedules] = useState<GeneratedSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generationParams, setGenerationParams] = useState({
    maxSchedules: 3,
    maxIterations: 1000,
    optimizationStrategy: 'balanced' as 'balanced' | 'coverage' | 'preferences' | 'fairness'
  })
  const [selectedScheduleForDetails, setSelectedScheduleForDetails] = useState<GeneratedSchedule | null>(null)
  const [isScheduleDetailsModalOpen, setIsScheduleDetailsModalOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch scheduling block details
        const blockResponse = await fetch(`/api/scheduling-blocks/${blockId}`)
        if (blockResponse.ok) {
          const blockData = await blockResponse.json()
          setSchedulingBlock(blockData.block)
        }

        // Fetch existing schedules
        await fetchSchedules()
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user && blockId) {
      fetchData()
    }
  }, [session, blockId])

  const fetchSchedules = async () => {
    try {
      const response = await fetch(`/api/schedules?blockId=${blockId}`)
      if (response.ok) {
        const data = await response.json()
        setSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
    }
  }

  const handleGenerateSchedules = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/schedules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId,
          ...generationParams
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Generated ${data.schedules.length} schedule options!`)
        setSchedules(data.schedules)
      } else {
        toast.error(data.error || 'Failed to generate schedules')
      }
    } catch (error) {
      console.error('Error generating schedules:', error)
      toast.error('Failed to generate schedules')
    } finally {
      setGenerating(false)
    }
  }

  const handleViewScheduleDetails = (schedule: GeneratedSchedule) => {
    setSelectedScheduleForDetails(schedule)
    setIsScheduleDetailsModalOpen(true)
  }

  const handleCloseScheduleDetailsModal = () => {
    setIsScheduleDetailsModalOpen(false)
    setSelectedScheduleForDetails(null)
  }

  const handleApproveSchedule = async (scheduleId: string, action: 'APPROVE' | 'ACTIVATE') => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message)
        await fetchSchedules() // Refresh the schedules list
      } else {
        toast.error(data.error || 'Failed to process schedule approval')
      }
    } catch (error) {
      console.error('Error processing schedule approval:', error)
      toast.error('Failed to process schedule approval')
    }
  }

  const handleRejectSchedule = async (scheduleId: string, reason?: string) => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}/approval`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message)
        await fetchSchedules() // Refresh the schedules list
      } else {
        toast.error(data.error || 'Failed to reject schedule')
      }
    } catch (error) {
      console.error('Error rejecting schedule:', error)
      toast.error('Failed to reject schedule')
    }
  }

  const handleExportSchedule = async (scheduleId: string, format: 'csv' | 'json' = 'csv') => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}/export?format=${format}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const contentDisposition = response.headers.get('Content-Disposition')
        const filename = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || `schedule_export.${format}`
        
        // Create download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        toast.success('Schedule exported successfully')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to export schedule')
      }
    } catch (error) {
      console.error('Error exporting schedule:', error)
      toast.error('Failed to export schedule')
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="SCHEDULER">
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
              <p className="mt-4 text-gray-600">Loading scheduling block...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!schedulingBlock) {
    return (
      <ProtectedRoute requiredRole="SCHEDULER">
        <DashboardLayout>
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Scheduling block not found</h3>
            <p className="mt-2 text-gray-600">This scheduling block may have been deleted.</p>
            <Link href="/dashboard/scheduler/blocks">
              <Button className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Scheduling Blocks
              </Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="SCHEDULER">
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Link href="/dashboard/scheduler/blocks">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Blocks
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{schedulingBlock.name}</h1>
                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                  <span>{format(parseISO(schedulingBlock.startDate), 'MMM d')} - {format(parseISO(schedulingBlock.endDate), 'MMM d, yyyy')}</span>
                  <span>•</span>
                  <span>{schedulingBlock.hospital}</span>
                  <span>•</span>
                  <span>{schedulingBlock._count.nursePreferences} nurse preferences</span>
                </div>
              </div>
              
              <Badge variant={schedulingBlock.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {schedulingBlock.status}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="schedules" className="space-y-6">
            <TabsList>
              <TabsTrigger value="schedules">Generated Schedules</TabsTrigger>
              <TabsTrigger value="preferences">Nurse Preferences</TabsTrigger>
              <TabsTrigger value="settings">Block Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="schedules" className="space-y-6">
              {/* Schedule Generation Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Schedule Generation</CardTitle>
                  <CardDescription>
                    Generate optimized schedules based on nurse preferences and hospital requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Max Schedules</label>
                      <Select
                        value={generationParams.maxSchedules.toString()}
                        onValueChange={(value) => setGenerationParams(prev => ({ ...prev, maxSchedules: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Schedule</SelectItem>
                          <SelectItem value="3">3 Schedules</SelectItem>
                          <SelectItem value="5">5 Schedules</SelectItem>
                          <SelectItem value="10">10 Schedules</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Optimization Strategy</label>
                      <Select
                        value={generationParams.optimizationStrategy}
                        onValueChange={(value) => setGenerationParams(prev => ({ 
                          ...prev, 
                          optimizationStrategy: value as typeof prev.optimizationStrategy 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="balanced">Balanced</SelectItem>
                          <SelectItem value="coverage">Prioritize Coverage</SelectItem>
                          <SelectItem value="preferences">Prioritize Preferences</SelectItem>
                          <SelectItem value="fairness">Prioritize Fairness</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      <Button 
                        onClick={handleGenerateSchedules}
                        disabled={generating || schedulingBlock._count.nursePreferences === 0}
                        className="w-full"
                      >
                        {generating ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {schedules.length > 0 ? 'Regenerate Schedules' : 'Generate Schedules'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {schedulingBlock._count.nursePreferences === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            No nurse preferences submitted
                          </h3>
                          <p className="mt-1 text-sm text-yellow-700">
                            Nurses need to submit their preferences before schedules can be generated.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Generated Schedules List */}
              {schedules.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Generated Schedules ({schedules.length})</h3>
                  
                  {schedules.map((schedule) => (
                    <Card key={schedule.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">Version {schedule.version}</Badge>
                            <Badge variant={
                              schedule.status === 'ACTIVE' ? 'default' : 
                              schedule.status === 'APPROVED' ? 'secondary' : 
                              'outline'
                            }>
                              {schedule.status}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="text-sm font-medium">
                                Score: {(schedule.optimizationScore * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewScheduleDetails(schedule)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleExportSchedule(schedule.id, 'csv')}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Export
                            </Button>
                            
                            {/* Approval Actions */}
                            {schedule.status === 'DRAFT' && (
                              <Button 
                                size="sm"
                                onClick={() => handleApproveSchedule(schedule.id, 'APPROVE')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Approve
                              </Button>
                            )}
                            
                            {schedule.status === 'APPROVED' && (
                              <>
                                <Button 
                                  size="sm"
                                  onClick={() => handleApproveSchedule(schedule.id, 'ACTIVATE')}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <Power className="mr-2 h-4 w-4" />
                                  Activate
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleRejectSchedule(schedule.id)}
                                  className="border-red-300 text-red-700 hover:bg-red-50"
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Revert
                                </Button>
                              </>
                            )}
                            
                            {schedule.status === 'ACTIVE' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleRejectSchedule(schedule.id)}
                                className="border-red-300 text-red-700 hover:bg-red-50"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Deactivate
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <div className="text-sm text-gray-600">Coverage</div>
                            <div className="font-medium">{(schedule.coverageScore * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Preferences</div>
                            <div className="font-medium">{(schedule.preferenceScore * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Fairness</div>
                            <div className="font-medium">{(schedule.fairnessScore * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Assignments</div>
                            <div className="font-medium">{schedule.statistics.totalAssignments}</div>
                          </div>
                        </div>

                        {schedule.violations.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex">
                              <AlertTriangle className="h-5 w-5 text-red-400" />
                              <div className="ml-3">
                                <h4 className="text-sm font-medium text-red-800">
                                  {schedule.violations.length} Constraint Violations
                                </h4>
                                <ul className="mt-1 text-sm text-red-700">
                                  {schedule.violations.slice(0, 3).map((violation, idx) => (
                                    <li key={idx}>• {violation}</li>
                                  ))}
                                  {schedule.violations.length > 3 && (
                                    <li>• ... and {schedule.violations.length - 3} more</li>
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {schedules.length === 0 && !generating && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Clock className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No schedules generated yet</h3>
                    <p className="mt-2 text-gray-600">
                      Generate your first schedule using the controls above.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="preferences">
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Nurse Preferences View</h3>
                  <p className="mt-2 text-gray-600">
                    View and manage nurse preference submissions for this scheduling block.
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    (Feature coming soon)
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardContent className="py-12 text-center">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Block Settings</h3>
                  <p className="mt-2 text-gray-600">
                    Configure scheduling rules and constraints for this block.
                  </p>
                  
                  <div className="mt-4 space-y-3">
                    <Link href={`/dashboard/scheduler/rules/${blockId}`}>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <Clock className="mr-2 h-4 w-4" />
                        Configure Scheduling Rules
                      </Button>
                    </Link>
                    <p className="text-sm text-gray-500">
                      Set hospital-specific rules like shift limits, coverage requirements, and time-off policies.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
      
      {/* Schedule Details Modal */}
      <ScheduleDetailsModal
        isOpen={isScheduleDetailsModalOpen}
        onClose={handleCloseScheduleDetailsModal}
        schedule={selectedScheduleForDetails}
        blockId={blockId}
        blockStartDate={schedulingBlock?.startDate || ''}
        blockEndDate={schedulingBlock?.endDate || ''}
        blockName={schedulingBlock?.name || ''}
      />
    </ProtectedRoute>
  )
}