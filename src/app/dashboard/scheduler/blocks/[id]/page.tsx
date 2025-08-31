'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/ui/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { 
  Calendar as CalendarIcon,
  Calendar,
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
  Power,
  Search,
  User
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

interface NursePreference {
  id: string
  nurseName: string
  nurseEmail: string
  shiftPreferences: Record<string, string>
  ptoRequests: string[]
  noScheduleRequests: string[]
  flexibilityScore: number
  submittedAt: string | null
  status: 'SUBMITTED' | 'PENDING' | 'REVIEWED'
  seniorityLevel: number
  contractHoursPerWeek: number
  maxShiftsPerBlock: number
  shiftTypes: string[]
  qualifications: string[]
  ptoBalance: number
  hireDate: string
}

interface NursePreferencesResponse {
  preferences: Record<string, {
    name: string
    preferredShifts: Record<string, string>
    ptoRequests: string[]
    noScheduleRequests: string[]
    flexibilityScore: number
    submittedAt?: string
    seniorityLevel: number
    contractHoursPerWeek: number
    maxShiftsPerBlock: number
    shiftTypes: string[]
    qualifications: string[]
    ptoBalance: number
    hireDate: string
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

  // Nurse Preferences State Management
  const [nursePreferences, setNursePreferences] = useState<Record<string, NursePreferencesResponse['preferences'][string]>>({})
  const [preferencesLoading, setPreferencesLoading] = useState(false)
  const [preferencesError, setPreferencesError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  // Interactive row selection state
  const [selectedNurse, setSelectedNurse] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

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

  // Separate useEffect for fetching nurse preferences
  useEffect(() => {
    const fetchNursePreferences = async () => {
      if (!session?.user || !blockId) return

      setPreferencesLoading(true)
      setPreferencesError(null)
      
      try {
        const response = await fetch(`/api/scheduling-blocks/${blockId}/nurse-preferences`)
        
        if (response.ok) {
          const data: NursePreferencesResponse = await response.json()
          setNursePreferences(data.preferences)
        } else {
          const errorData = await response.json()
          setPreferencesError(errorData.error || 'Failed to load nurse preferences')
          toast.error('Failed to load nurse preferences')
        }
      } catch (error) {
        console.error('Error fetching nurse preferences:', error)
        setPreferencesError('Failed to load nurse preferences')
        toast.error('Failed to load nurse preferences')
      } finally {
        setPreferencesLoading(false)
      }
    }

    fetchNursePreferences()
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

  // Export functionality for nurse preferences
  const handleExportPreferences = (format: 'csv' | 'json' = 'csv') => {
    try {
      const filteredPreferences = getFilteredNursePreferences()
      
      if (filteredPreferences.length === 0) {
        toast.error('No data to export')
        return
      }

      if (format === 'csv') {
        // Create CSV content
        const csvHeaders = [
          'Nurse Name',
          'Email', 
          'Preferred Work Days',
          'Avoid Days',
          'Max Shifts Per Week',
          'PTO Requests',
          'No Schedule Requests',
          'Status',
          'Last Updated'
        ]

        const csvRows = filteredPreferences.map(([nurseId, preference]) => {
          const shiftCounts = getShiftPreferencesCount(preference.shiftPreferences)
          const ptoCounts = getShiftPreferencesCount(preference.ptoRequests)
          
          // Extract dates for PTO and no-schedule requests
          const ptoDatesList = Object.entries(preference.ptoRequests || {})
            .filter(([, type]) => type === 'pto')
            .map(([date]) => new Date(date).toLocaleDateString())
            .join('; ')
          
          const noScheduleDatesList = Object.entries(preference.ptoRequests || {})
            .filter(([, type]) => type === 'no-schedule')
            .map(([date]) => new Date(date).toLocaleDateString())
            .join('; ')

          return [
            `"${preference.name}"`,
            `"${preference.email}"`,
            `"${shiftCounts.work} days"`,
            `"${shiftCounts.avoid} days"`,
            `"${preference.maxShiftsPerBlock || 'Not specified'}"`,
            `"${ptoDatesList || 'None'}"`,
            `"${noScheduleDatesList || 'None'}"`,
            `"${preference.status === 'submitted' ? 'Submitted' : preference.status === 'draft' ? 'Draft' : 'Not Started'}"`,
            `"${formatPreferenceDate(preference.submittedAt) || 'Never'}"`
          ].join(',')
        })

        const csvContent = [csvHeaders.join(','), ...csvRows].join('\n')
        
        // Create and download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        
        // Generate filename with block name and timestamp
        const timestamp = new Date().toISOString().split('T')[0]
        const blockName = schedulingBlock?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'block'
        const filename = `nurse-preferences_${blockName}_${timestamp}.csv`
        
        link.href = URL.createObjectURL(blob)
        link.download = filename
        link.click()
        
        // Clean up
        URL.revokeObjectURL(link.href)
        
        toast.success(`Exported ${filteredPreferences.length} nurse preferences to ${filename}`)
      }
    } catch (error) {
      console.error('Error exporting nurse preferences:', error)
      toast.error('Failed to export nurse preferences')
    }
  }

  // Helper functions for nurse preferences filtering and formatting
  const getFilteredNursePreferences = () => {
    return Object.entries(nursePreferences).filter(([nurseId, preference]) => {
      // Filter by search term (nurse name)
      const matchesSearch = searchTerm === '' || 
        preference.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      // Filter by status (for now, all preferences are considered submitted if they have submittedAt)
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'submitted' && preference.submittedAt) ||
        (filterStatus === 'pending' && !preference.submittedAt)
      
      return matchesSearch && matchesStatus
    })
  }

  const formatPreferenceDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not submitted'
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy')
    } catch {
      return 'Invalid date'
    }
  }

  // Helper function to determine preference status
  const getPreferenceStatus = (preference: any) => {
    if (!preference) return 'notStarted'
    if (preference.submittedAt) return 'submitted'
    // If preferences exist but not submitted, consider it draft
    if (preference.preferredShifts && Object.keys(preference.preferredShifts).length > 0) {
      return 'draft'
    }
    return 'notStarted'
  }

  // Enhanced statistics calculation function
  const getPreferencesSummary = () => {
    const allPreferences = Object.values(nursePreferences)
    const total = allPreferences.length
    
    // Count by status
    const submitted = allPreferences.filter(p => getPreferenceStatus(p) === 'submitted').length
    const draft = allPreferences.filter(p => getPreferenceStatus(p) === 'draft').length
    const notStarted = allPreferences.filter(p => getPreferenceStatus(p) === 'notStarted').length
    const pending = total - submitted
    
    return {
      total,
      submitted,
      draft,
      notStarted,
      pending,
      submissionRate: total > 0 ? Math.round((submitted / total) * 100) : 0
    }
  }

  const getShiftPreferencesCount = (preferences: Record<string, string> | undefined | null) => {
    const counts = { work: 0, pto: 0, noSchedule: 0, avoid: 0 }
    
    // Safety check: ensure preferences exists
    if (!preferences || typeof preferences !== 'object') {
      return counts
    }
    
    // Handle object format (for shiftPreferences)
    Object.values(preferences).forEach(preference => {
      if (preference === 'work') counts.work++
      else if (preference === 'pto') counts.pto++
      else if (preference === 'no-schedule') counts.noSchedule++
      else if (preference === 'avoid') counts.avoid++
    })
    
    return counts
  }

  // Separate function to count PTO requests (array format)
  const getPtoRequestCount = (ptoRequests: string[] | undefined | null) => {
    if (!Array.isArray(ptoRequests)) return 0
    return ptoRequests.length
  }

  // Separate function to count no-schedule requests (array format)
  const getNoScheduleRequestCount = (noScheduleRequests: string[] | undefined | null) => {
    if (!Array.isArray(noScheduleRequests)) return 0
    return noScheduleRequests.length
  }

  // Interactive handlers for row selection and expansion
  const handleRowClick = (nurseId: string) => {
    setSelectedNurse(selectedNurse === nurseId ? null : nurseId)
    
    const newExpandedRows = new Set(expandedRows)
    if (expandedRows.has(nurseId)) {
      newExpandedRows.delete(nurseId)
    } else {
      newExpandedRows.add(nurseId)
    }
    setExpandedRows(newExpandedRows)
  }

  const handleKeyDown = (event: React.KeyboardEvent, nurseId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleRowClick(nurseId)
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
              <div className="space-y-6" role="region" aria-labelledby="preferences-heading">
                {/* Header Section */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 id="preferences-heading" className="text-2xl font-bold text-gray-900">Nurse Preferences</h2>
                      <p className="text-gray-600">View and manage nurse preference submissions for this scheduling block.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2" role="search" aria-label="Search and filter nurse preferences">
                      <div className="relative">
                        <label htmlFor="nurse-search" className="sr-only">Search nurse preferences</label>
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                        <Input
                          id="nurse-search"
                          placeholder="Search by nurse name or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-full sm:w-64"
                          aria-describedby="search-description"
                        />
                        <div id="search-description" className="sr-only">
                          Search through nurse names and email addresses in the preferences list
                        </div>
                      </div>
                      <div>
                        <label htmlFor="status-filter" className="sr-only">Filter by preference status</label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger id="status-filter" className="w-full sm:w-40" aria-describedby="filter-description">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="not_started">Not Started</SelectItem>
                          </SelectContent>
                        </Select>
                        <div id="filter-description" className="sr-only">
                          Filter nurse preferences by their submission status
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => handleExportPreferences('csv')}
                        disabled={preferencesLoading || getFilteredNursePreferences().length === 0}
                        className="w-full sm:w-auto"
                        aria-describedby="export-description"
                      >
                        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                        Export CSV
                      </Button>
                      <div id="export-description" className="sr-only">
                        Export currently filtered nurse preferences to a CSV file for download
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Statistics Cards */}
                  {!preferencesLoading && !preferencesError && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" role="region" aria-labelledby="statistics-heading">
                      <h3 id="statistics-heading" className="sr-only">Nurse Preferences Statistics</h3>
                      {/* Total Nurses Card */}
                      <Card className="relative overflow-hidden hover:shadow-md transition-shadow duration-200 border-l-4 border-l-blue-500">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="text-2xl sm:text-3xl font-bold text-blue-700">
                                {getPreferencesSummary().total}
                              </div>
                              <div className="text-sm font-medium text-gray-700">Total Nurses</div>
                            </div>
                            <div className="h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                              <Users className="h-6 w-6 sm:h-7 sm:w-7 text-blue-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Submitted Card with Progress */}
                      <Card className="relative overflow-hidden hover:shadow-md transition-shadow duration-200 border-l-4 border-l-green-500">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="text-2xl sm:text-3xl font-bold text-green-700">
                                {getPreferencesSummary().submitted}
                              </div>
                              <div className="text-sm font-medium text-gray-700">Submitted</div>
                              <div className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-full inline-block mt-1">
                                {getPreferencesSummary().submissionRate}% complete
                              </div>
                            </div>
                            <div className="h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center shadow-sm">
                              <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 text-green-700" />
                            </div>
                          </div>
                          <div className="mt-4 w-full bg-gray-200 rounded-full h-2 shadow-inner">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500 shadow-sm" 
                              style={{ width: `${getPreferencesSummary().submissionRate}%` }}
                            ></div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Draft Card */}
                      <Card className="relative overflow-hidden hover:shadow-md transition-shadow duration-200 border-l-4 border-l-amber-500">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="text-2xl sm:text-3xl font-bold text-amber-700">
                                {getPreferencesSummary().draft}
                              </div>
                              <div className="text-sm font-medium text-gray-700">Draft</div>
                              <div className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded-full inline-block mt-1">
                                In progress
                              </div>
                            </div>
                            <div className="h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center shadow-sm">
                              <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-amber-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Not Started Card */}
                      <Card className="relative overflow-hidden hover:shadow-md transition-shadow duration-200 border-l-4 border-l-slate-400">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="text-2xl sm:text-3xl font-bold text-slate-700">
                                {getPreferencesSummary().notStarted}
                              </div>
                              <div className="text-sm font-medium text-gray-700">Not Started</div>
                              <div className="text-xs text-slate-600 font-semibold bg-slate-50 px-2 py-1 rounded-full inline-block mt-1">
                                Awaiting input
                              </div>
                            </div>
                            <div className="h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center shadow-sm">
                              <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 text-slate-700" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>

                {/* Enhanced Loading State with Table Structure Skeleton */}
                {preferencesLoading && (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nurse</TableHead>
                            <TableHead>Preferred Shifts</TableHead>
                            <TableHead>Avoid Shifts</TableHead>
                            <TableHead>Max Shifts/Week</TableHead>
                            <TableHead>PTO/No Schedule</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...Array(6)].map((_, i) => (
                            <TableRow key={i} className="animate-pulse">
                              {/* Nurse Info Column */}
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="space-y-2">
                                    <div 
                                      className="h-4 bg-gray-200 rounded"
                                      style={{ 
                                        width: `${80 + Math.random() * 40}px`,
                                        animationDelay: `${i * 100}ms`
                                      }}
                                    ></div>
                                    <div 
                                      className="h-3 bg-gray-100 rounded"
                                      style={{ 
                                        width: `${100 + Math.random() * 60}px`,
                                        animationDelay: `${i * 100 + 50}ms`
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </TableCell>
                              
                              {/* Preferred Shifts Column */}
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  <div 
                                    className="h-5 bg-gray-200 rounded-full px-2"
                                    style={{ 
                                      width: `${60 + Math.random() * 30}px`,
                                      animationDelay: `${i * 100 + 100}ms`
                                    }}
                                  ></div>
                                  {Math.random() > 0.5 && (
                                    <div 
                                      className="h-5 bg-gray-100 rounded-full px-2"
                                      style={{ 
                                        width: `${50 + Math.random() * 25}px`,
                                        animationDelay: `${i * 100 + 150}ms`
                                      }}
                                    ></div>
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Avoid Shifts Column */}
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {Math.random() > 0.4 && (
                                    <div 
                                      className="h-5 bg-gray-200 rounded-full px-2"
                                      style={{ 
                                        width: `${55 + Math.random() * 35}px`,
                                        animationDelay: `${i * 100 + 200}ms`
                                      }}
                                    ></div>
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Max Shifts Column */}
                              <TableCell>
                                <div 
                                  className="h-4 bg-gray-200 rounded"
                                  style={{ 
                                    width: `${30 + Math.random() * 20}px`,
                                    animationDelay: `${i * 100 + 250}ms`
                                  }}
                                ></div>
                              </TableCell>
                              
                              {/* PTO/No Schedule Column */}
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {Math.random() > 0.6 && (
                                    <div 
                                      className="h-5 bg-green-100 rounded-full px-2"
                                      style={{ 
                                        width: `${45 + Math.random() * 25}px`,
                                        animationDelay: `${i * 100 + 300}ms`
                                      }}
                                    ></div>
                                  )}
                                  {Math.random() > 0.7 && (
                                    <div 
                                      className="h-5 bg-gray-100 rounded-full px-2"
                                      style={{ 
                                        width: `${60 + Math.random() * 30}px`,
                                        animationDelay: `${i * 100 + 350}ms`
                                      }}
                                    ></div>
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Status Column */}
                              <TableCell>
                                <div 
                                  className={`h-6 rounded-full px-3 ${
                                    i % 3 === 0 ? 'bg-green-100' : 
                                    i % 3 === 1 ? 'bg-yellow-100' : 'bg-gray-100'
                                  }`}
                                  style={{ 
                                    width: `${70 + Math.random() * 20}px`,
                                    animationDelay: `${i * 100 + 400}ms`
                                  }}
                                ></div>
                              </TableCell>
                              
                              {/* Last Updated Column */}
                              <TableCell>
                                <div 
                                  className="h-4 bg-gray-200 rounded"
                                  style={{ 
                                    width: `${80 + Math.random() * 30}px`,
                                    animationDelay: `${i * 100 + 450}ms`
                                  }}
                                ></div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Error State */}
                {preferencesError && (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">Error Loading Preferences</h3>
                      <p className="mt-2 text-gray-600">{preferencesError}</p>
                      <Button 
                        onClick={() => window.location.reload()} 
                        className="mt-4"
                        variant="outline"
                      >
                        Try Again
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Table Content */}
                {!preferencesLoading && !preferencesError && (
                  <Card>
                    <CardContent className="p-0">
                      {getFilteredNursePreferences().length === 0 ? (
                        <div className="p-6 text-center">
                          <Users className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-4 text-lg font-medium text-gray-900">
                            {searchTerm || filterStatus !== 'all' ? 'No matching preferences found' : 'No nurse preferences yet'}
                          </h3>
                          <p className="mt-2 text-gray-600">
                            {searchTerm || filterStatus !== 'all' 
                              ? 'Try adjusting your search or filter criteria.' 
                              : 'Nurses will see their preference submissions here once they start submitting.'}
                          </p>
                        </div>
                      ) : (
                        <Table role="table" aria-labelledby="preferences-table-caption">
                          <caption id="preferences-table-caption" className="sr-only">
                            Nurse preferences table showing {getFilteredNursePreferences().length} nurses with their shift preferences, PTO requests, and submission status. Use Tab to navigate, Enter or Space to expand details.
                          </caption>
                          <TableHeader>
                            <TableRow>
                              <TableHead scope="col">Nurse</TableHead>
                              <TableHead scope="col">Preferred Shifts</TableHead>
                              <TableHead scope="col">Avoid Shifts</TableHead>
                              <TableHead scope="col">Max Shifts/Week</TableHead>
                              <TableHead scope="col">PTO/No Schedule</TableHead>
                              <TableHead scope="col">Status</TableHead>
                              <TableHead scope="col">Last Updated</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getFilteredNursePreferences().map(([nurseId, preference]) => {
                              const shiftCounts = getShiftPreferencesCount(preference.shiftPreferences);
                              const ptoCount = getPtoRequestCount(preference.ptoRequests);
                              const noScheduleCount = getNoScheduleRequestCount(preference.noScheduleRequests);
                              const isExpanded = expandedRows.has(nurseId);
                              const isSelected = selectedNurse === nurseId;
                              
                              return (
                                <React.Fragment key={nurseId}>
                                  <TableRow 
                                    className={`cursor-pointer transition-colors duration-200 hover:bg-gray-50 ${
                                      isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                    }`}
                                    onClick={() => handleRowClick(nurseId)}
                                    onKeyDown={(e) => handleKeyDown(e, nurseId)}
                                    tabIndex={0}
                                    role="button"
                                    aria-expanded={isExpanded}
                                    aria-label={`View details for ${preference.name}`}
                                  >
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                          <Play className="h-3 w-3 text-gray-400" />
                                        </div>
                                        <div>
                                          <div className="font-medium text-gray-900">{preference.name}</div>
                                          <div className="text-sm text-gray-500">{nurseId}@hospital.com</div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap gap-1">
                                        {shiftCounts.work > 0 && (
                                          <Badge variant="secondary" className="text-xs">
                                            {shiftCounts.work} work days
                                          </Badge>
                                        )}
                                        {shiftCounts.work === 0 && (
                                          <span className="text-sm text-gray-500">None specified</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap gap-1">
                                        {shiftCounts.avoid > 0 && (
                                          <Badge variant="outline" className="text-xs">
                                            {shiftCounts.avoid} avoid days
                                          </Badge>
                                        )}
                                        {shiftCounts.avoid === 0 && (
                                          <span className="text-sm text-gray-500">None specified</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-sm font-medium">
                                        {preference.maxShiftsPerBlock || 'Not specified'}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap gap-1">
                                        {ptoCount > 0 && (
                                          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                            {ptoCount} PTO
                                          </Badge>
                                        )}
                                        {noScheduleCount > 0 && (
                                          <Badge variant="default" className="text-xs bg-gray-100 text-gray-800">
                                            {noScheduleCount} no schedule
                                          </Badge>
                                        )}
                                        {ptoCount === 0 && noScheduleCount === 0 && (
                                          <span className="text-sm text-gray-500">None</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={preference.status === 'submitted' ? 'default' : preference.status === 'draft' ? 'secondary' : 'outline'}
                                        className={
                                          preference.status === 'submitted' 
                                            ? 'bg-green-100 text-green-800' 
                                            : preference.status === 'draft' 
                                            ? 'bg-yellow-100 text-yellow-800' 
                                            : 'bg-gray-100 text-gray-800'
                                        }
                                      >
                                        {preference.status === 'submitted' ? 'Submitted' : 
                                         preference.status === 'draft' ? 'Draft' : 'Not Started'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-sm text-gray-600">
                                        {formatPreferenceDate(preference.submittedAt)}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                  
                                  {/* Expandable Row Details */}
                                  {isExpanded && (
                                    <TableRow className="bg-gray-50 border-none">
                                      <TableCell colSpan={7} className="px-6 py-4">
                                        <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">
                                          {/* Detailed Information Header */}
                                          <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                                            <User className="h-5 w-5 text-blue-600" />
                                            <h4 className="text-lg font-semibold text-gray-900">
                                              {preference.name} - Detailed Preferences
                                            </h4>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Shift Preferences Details */}
                                            <div className="space-y-4">
                                              <h5 className="font-medium text-gray-900 flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-blue-600" />
                                                Detailed Shift Preferences
                                              </h5>
                                              <div className="bg-white rounded-lg border p-4 space-y-3">
                                                {Object.entries(preference.shiftPreferences || {}).length > 0 ? (
                                                  Object.entries(preference.shiftPreferences).map(([date, pref]) => (
                                                    <div key={date} className="flex items-center justify-between py-1">
                                                      <span className="text-sm font-medium text-gray-700">
                                                        {format(parseISO(date), 'EEE, MMM dd')}
                                                      </span>
                                                      <Badge 
                                                        variant="outline" 
                                                        className={
                                                          pref === 'work' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                                                          pref === 'avoid' ? 'border-red-300 text-red-700 bg-red-50' :
                                                          'border-gray-300 text-gray-700 bg-gray-50'
                                                        }
                                                      >
                                                        {pref === 'work' ? 'Prefer Work' : 
                                                         pref === 'avoid' ? 'Avoid' : pref}
                                                      </Badge>
                                                    </div>
                                                  ))
                                                ) : (
                                                  <p className="text-sm text-gray-500 italic">No specific shift preferences set</p>
                                                )}
                                              </div>
                                            </div>
                                            
                                            {/* PTO and No-Schedule Details */}
                                            <div className="space-y-4">
                                              <h5 className="font-medium text-gray-900 flex items-center gap-2">
                                                <CalendarIcon className="h-4 w-4 text-green-600" />
                                                PTO & No-Schedule Requests
                                              </h5>
                                              <div className="bg-white rounded-lg border p-4 space-y-3">
                                                {/* PTO Requests Section */}
                                                <div className="space-y-2">
                                                  <h6 className="text-sm font-semibold text-gray-900">PTO Requests</h6>
                                                  {Array.isArray(preference.ptoRequests) && preference.ptoRequests.length > 0 ? (
                                                    preference.ptoRequests.map((date: string, index: number) => (
                                                      <div key={`pto-${index}`} className="flex items-center justify-between py-1">
                                                        <span className="text-sm font-medium text-gray-700">
                                                          {format(parseISO(date), 'EEE, MMM dd, yyyy')}
                                                        </span>
                                                        <Badge variant="default" className="bg-green-100 text-green-800">
                                                          PTO Request
                                                        </Badge>
                                                      </div>
                                                    ))
                                                  ) : (
                                                    <p className="text-sm text-gray-500 italic">No PTO requests</p>
                                                  )}
                                                </div>
                                                
                                                {/* No Schedule Requests Section */}
                                                <div className="space-y-2">
                                                  <h6 className="text-sm font-semibold text-gray-900">No Schedule Requests</h6>
                                                  {Array.isArray(preference.noScheduleRequests) && preference.noScheduleRequests.length > 0 ? (
                                                    preference.noScheduleRequests.map((date: string, index: number) => (
                                                      <div key={`no-schedule-${index}`} className="flex items-center justify-between py-1">
                                                        <span className="text-sm font-medium text-gray-700">
                                                          {format(parseISO(date), 'EEE, MMM dd, yyyy')}
                                                        </span>
                                                        <Badge variant="default" className="bg-gray-100 text-gray-800">
                                                          No Schedule
                                                        </Badge>
                                                      </div>
                                                    ))
                                                  ) : (
                                                    <p className="text-sm text-gray-500 italic">No no-schedule requests</p>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Submission Information */}
                                          <div className="bg-white rounded-lg border p-4 mt-4">
                                            <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                              <Clock className="h-4 w-4 text-gray-600" />
                                              Submission Details
                                            </h5>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                              <div>
                                                <span className="text-gray-600">Status:</span>
                                                <div className="mt-1">
                                                  <Badge 
                                                    variant={preference.status === 'submitted' ? 'default' : 'secondary'}
                                                    className={
                                                      preference.status === 'submitted' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : preference.status === 'draft' 
                                                        ? 'bg-yellow-100 text-yellow-800' 
                                                        : 'bg-gray-100 text-gray-800'
                                                    }
                                                  >
                                                    {preference.status === 'submitted' ? 'Submitted' : 
                                                     preference.status === 'draft' ? 'Draft' : 'Not Started'}
                                                  </Badge>
                                                </div>
                                              </div>
                                              <div>
                                                <span className="text-gray-600">Last Updated:</span>
                                                <div className="mt-1 font-medium text-gray-900">
                                                  {formatPreferenceDate(preference.submittedAt) || 'Never'}
                                                </div>
                                              </div>
                                              <div>
                                                <span className="text-gray-600">Max Shifts/Week:</span>
                                                <div className="mt-1 font-medium text-gray-900">
                                                  {preference.maxShiftsPerBlock || 'Not specified'}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
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