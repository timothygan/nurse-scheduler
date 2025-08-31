'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Calendar,
  User,
  Clock,
  Sun,
  Moon,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  BarChart3
} from 'lucide-react'
import { format, parseISO, eachDayOfInterval } from 'date-fns'

interface ScheduleAssignment {
  id: string
  nurseId: string
  nurseName: string
  date: string
  shiftType: 'DAY' | 'NIGHT'
  preferenceSatisfactionScore: number
}

interface GeneratedSchedule {
  id: string
  version: number
  optimizationScore: number
  coverageScore: number
  preferenceScore: number
  fairnessScore: number
  seniorityScore: number
  violations: string[]
  statistics: {
    totalAssignments: number
    nurseWorkloads: Record<string, number>
    coverageMetrics: Record<string, number>
    preferenceSatisfaction: Record<string, number>
  }
  assignments: ScheduleAssignment[]
}

interface ScheduleDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  schedule: GeneratedSchedule | null
  blockId: string
  blockStartDate: string
  blockEndDate: string
  blockName: string
}

interface NursePreferences {
  [nurseId: string]: {
    name: string
    preferredShifts: Record<string, 'DAY' | 'NIGHT' | 'ANY'>
    ptoRequests: string[]
    noScheduleRequests: string[]
    flexibilityScore: number
    seniorityLevel: number
    contractHoursPerWeek: number
    maxShiftsPerBlock: number
    shiftTypes: ('DAY' | 'NIGHT')[]
    qualifications: string[]
    ptoBalance: number
    hireDate: string
    submittedAt?: string
  }
}

export function ScheduleDetailsModal({ 
  isOpen, 
  onClose, 
  schedule, 
  blockId,
  blockStartDate, 
  blockEndDate, 
  blockName 
}: ScheduleDetailsModalProps) {
  const [selectedNurse, setSelectedNurse] = useState<string>('all')
  const [nursePreferences, setNursePreferences] = useState<NursePreferences>({})
  const [loading, setLoading] = useState(false)

  // Get unique nurses from assignments
  const nurses = schedule ? 
    schedule.assignments
      .reduce((unique: { id: string; name: string }[], assignment) => {
        const exists = unique.find(nurse => nurse.id === assignment.nurseId)
        if (!exists) {
          unique.push({ id: assignment.nurseId, name: assignment.nurseName })
        }
        return unique
      }, [])
      .sort((a, b) => a.name.localeCompare(b.name)) 
    : []

  // Generate date range for the block
  const dateRange = blockStartDate && blockEndDate ? eachDayOfInterval({
    start: parseISO(blockStartDate),
    end: parseISO(blockEndDate)
  }) : []

  // Fetch nurse preferences when modal opens
  useEffect(() => {
    if (isOpen && schedule) {
      fetchNursePreferences()
    }
  }, [isOpen, schedule])

  const fetchNursePreferences = async () => {
    if (!schedule) return
    
    setLoading(true)
    try {
      // Fetch real nurse preferences from the API
      const response = await fetch(`/api/scheduling-blocks/${blockId}/nurse-preferences`)
      
      if (response.ok) {
        const data = await response.json()
        setNursePreferences(data.preferences || {})
      } else {
        console.error('Failed to fetch nurse preferences:', response.status)
        // Fallback to empty preferences if API fails
        const fallbackPreferences: NursePreferences = {}
        nurses.forEach(nurse => {
          fallbackPreferences[nurse.id] = {
            name: nurse.name,
            preferredShifts: {},
            ptoRequests: [],
            noScheduleRequests: [],
            flexibilityScore: 5,
            seniorityLevel: 0,
            contractHoursPerWeek: 40,
            maxShiftsPerBlock: 15,
            shiftTypes: ['DAY'],
            qualifications: ['RN'],
            ptoBalance: 0,
            hireDate: new Date().toISOString()
          }
        })
        setNursePreferences(fallbackPreferences)
      }
    } catch (error) {
      console.error('Error fetching nurse preferences:', error)
      // Fallback to empty preferences on error
      const fallbackPreferences: NursePreferences = {}
      nurses.forEach(nurse => {
        fallbackPreferences[nurse.id] = {
          name: nurse.name,
          preferredShifts: {},
          ptoRequests: [],
          noScheduleRequests: [],
          flexibilityScore: 5,
          seniorityLevel: 0,
          contractHoursPerWeek: 40,
          maxShiftsPerBlock: 15,
          shiftTypes: ['DAY'],
          qualifications: ['RN'],
          ptoBalance: 0,
          hireDate: new Date().toISOString()
        }
      })
      setNursePreferences(fallbackPreferences)
    } finally {
      setLoading(false)
    }
  }

  // Get assignments for selected nurse or all nurses
  const getDisplayAssignments = () => {
    if (!schedule) return []
    if (selectedNurse === 'all') return schedule.assignments
    return schedule.assignments.filter(a => a.nurseId === selectedNurse)
  }

  // Group assignments by date for calendar view
  const getAssignmentsByDate = () => {
    const assignments = getDisplayAssignments()
    const byDate: Record<string, ScheduleAssignment[]> = {}
    
    assignments.forEach(assignment => {
      if (!byDate[assignment.date]) {
        byDate[assignment.date] = []
      }
      byDate[assignment.date].push(assignment)
    })
    
    return byDate
  }

  // Calculate preference satisfaction for a nurse
  const getPreferenceSatisfactionForNurse = (nurseId: string) => {
    const nurseAssignments = schedule?.assignments.filter(a => a.nurseId === nurseId) || []
    if (nurseAssignments.length === 0) return 0
    
    const avgSatisfaction = nurseAssignments.reduce((sum, a) => sum + a.preferenceSatisfactionScore, 0) / nurseAssignments.length
    return avgSatisfaction * 100
  }

  // Calculate PTO violation rate for a nurse
  const calculatePTOViolations = (nurseId: string) => {
    const nursePrefs = nursePreferences[nurseId]
    if (!nursePrefs || !nursePrefs.ptoRequests) return { violations: 0, total: 0, percentage: 100 }
    
    const nurseAssignments = schedule?.assignments.filter(a => a.nurseId === nurseId) || []
    const ptoRequests = nursePrefs.ptoRequests
    
    let violations = 0
    ptoRequests.forEach(ptoDate => {
      const hasAssignment = nurseAssignments.some(assignment => assignment.date === ptoDate)
      if (hasAssignment) {
        violations++
      }
    })
    
    const total = ptoRequests.length
    const percentage = total > 0 ? ((total - violations) / total) * 100 : 100
    
    return { violations, total, percentage }
  }

  // Calculate shift preference match for a nurse
  const calculateShiftPreferenceMatch = (nurseId: string) => {
    const nursePrefs = nursePreferences[nurseId]
    if (!nursePrefs || !nursePrefs.preferredShifts) return 0
    
    const nurseAssignments = schedule?.assignments.filter(a => a.nurseId === nurseId) || []
    if (nurseAssignments.length === 0) return 0
    
    let matches = 0
    nurseAssignments.forEach(assignment => {
      const preferredShift = nursePrefs.preferredShifts[assignment.date]
      if (preferredShift === assignment.shiftType || preferredShift === 'ANY') {
        matches++
      }
    })
    
    return nurseAssignments.length > 0 ? (matches / nurseAssignments.length) * 100 : 0
  }

  const assignmentsByDate = getAssignmentsByDate()

  if (!schedule) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-8">
        <DialogHeader className="pb-8 space-y-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Calendar className="h-6 w-6" />
            {blockName} - Schedule Version {schedule.version}
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600">
            {format(parseISO(blockStartDate), 'MMM d')} - {format(parseISO(blockEndDate), 'MMM d, yyyy')} • 
            {schedule.assignments.length} total assignments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          {/* Controls */}
          <div className="flex items-center justify-between p-6 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-6">
              <div>
                <label className="block text-sm font-medium mb-3">View Schedule For:</label>
                <Select value={selectedNurse} onValueChange={setSelectedNurse}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="all">All Nurses</SelectItem>
                    {nurses.map(nurse => (
                      <SelectItem key={nurse.id} value={nurse.id}>
                        {nurse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Score: {(schedule.optimizationScore * 100).toFixed(1)}%
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="calendar" className="space-y-6">
            <TabsList className="h-12">
              <TabsTrigger value="calendar" className="text-sm font-medium px-6">Calendar View</TabsTrigger>
              <TabsTrigger value="preferences" className="text-sm font-medium px-6">Preference Analysis</TabsTrigger>
              <TabsTrigger value="statistics" className="text-sm font-medium px-6">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="space-y-8 mt-6">
              {/* Calendar Grid */}
              <Card>
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <Calendar className="h-5 w-5" />
                    Schedule Calendar
                    {selectedNurse !== 'all' && (
                      <Badge variant="secondary" className="text-xs px-3 py-1">
                        {nurses.find(n => n.id === selectedNurse)?.name}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-7 gap-3">
                    {/* Header row */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                        {day}
                      </div>
                    ))}
                    
                    {/* Calendar days */}
                    {dateRange.map(date => {
                      const dateStr = format(date, 'yyyy-MM-dd')
                      const dayAssignments = assignmentsByDate[dateStr] || []
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6
                      
                      return (
                        <div
                          key={dateStr}
                          className={`min-h-[90px] p-3 border rounded-lg ${
                            isWeekend ? 'bg-gray-50' : 'bg-white'
                          }`}
                        >
                          <div className="text-sm font-medium mb-2">
                            {format(date, 'd')}
                          </div>
                          
                          <div className="space-y-3">
                            {dayAssignments.map(assignment => (
                              <div
                                key={assignment.id}
                                className={`text-xs px-2 py-1.5 rounded flex items-center gap-1.5 ${
                                  assignment.shiftType === 'DAY'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {assignment.shiftType === 'DAY' ? (
                                  <Sun className="h-3 w-3" />
                                ) : (
                                  <Moon className="h-3 w-3" />
                                )}
                                {selectedNurse === 'all' ? (
                                  <span>{assignment.nurseName.split(' ')[0]}</span>
                                ) : (
                                  <span>{assignment.shiftType}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-8 mt-6">
              {selectedNurse !== 'all' ? (
                <div className="space-y-8">
                  {/* Nurse Information Card */}
                  <Card>
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <User className="h-5 w-5" />
                        {nurses.find(n => n.id === selectedNurse)?.name} - Profile & Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Profile Info */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900">Profile Information</h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Seniority Level:</span>
                              <span className="font-medium">Level 3</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Hire Date:</span>
                              <span className="font-medium">Jan 15, 2022</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Shift Types:</span>
                              <span className="font-medium">DAY, NIGHT</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Qualifications:</span>
                              <span className="font-medium">RN, BLS</span>
                            </div>
                          </div>
                        </div>

                        {/* Contract Info */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900">Contract Details</h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Hours/Week:</span>
                              <span className="font-medium">40 hours</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Max Shifts/Block:</span>
                              <span className="font-medium">15 shifts</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">PTO Balance:</span>
                              <span className="font-medium">12 days</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Actual Shifts:</span>
                              <span className="font-medium">{schedule.assignments.filter(a => a.nurseId === selectedNurse).length}</span>
                            </div>
                          </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">Schedule Performance</h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Preference Satisfaction:</span>
                              <span className="font-medium text-green-600">
                                {getPreferenceSatisfactionForNurse(selectedNurse).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">PTO Requests:</span>
                              <span className="font-medium">2 days</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">No-Schedule Requests:</span>
                              <span className="font-medium">1 day</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Flexibility Score:</span>
                              <span className="font-medium">85%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Side-by-side Calendar Comparison */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Schedule Comparison - Requested vs Assigned
                      </CardTitle>
                      <CardDescription>
                        Compare what {nurses.find(n => n.id === selectedNurse)?.name} requested versus what was actually assigned
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Requested Schedule */}
                        <div>
                          <h4 className="font-medium mb-6 flex items-center gap-2 text-base">
                            <Sun className="h-4 w-4 text-blue-500" />
                            Requested Schedule
                          </h4>
                          <div className="border rounded-lg p-6 bg-blue-50">
                            <div className="grid grid-cols-7 gap-2 mb-4">
                              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                                <div key={`day-${index}`} className="text-center text-xs font-medium text-gray-600 p-2">
                                  {day}
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                              {dateRange.map(date => {
                                const dateStr = format(date, 'yyyy-MM-dd')
                                // Get real preference data from nursePreferences
                                const nursePrefs = nursePreferences[selectedNurse]
                                const preferredShift = nursePrefs?.preferredShifts[dateStr] || null
                                const isPto = nursePrefs?.ptoRequests.includes(dateStr) || false
                                const isNoSchedule = nursePrefs?.noScheduleRequests.includes(dateStr) || false
                                
                                return (
                                  <div
                                    key={dateStr}
                                    className="aspect-square p-1 text-xs border rounded bg-white flex flex-col items-center justify-center"
                                  >
                                    <div className="font-medium">{format(date, 'd')}</div>
                                    {isPto ? (
                                      <div className="text-orange-600 font-bold">PTO</div>
                                    ) : isNoSchedule ? (
                                      <div className="text-gray-400">OFF</div>
                                    ) : preferredShift && preferredShift !== 'ANY' ? (
                                      <div className={`text-xs px-1 rounded ${
                                        preferredShift === 'DAY' ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-200 text-blue-800'
                                      }`}>
                                        {preferredShift === 'DAY' ? 'D' : 'N'}
                                      </div>
                                    ) : (
                                      <div className="text-gray-300">ANY</div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                          
                          {/* Legend */}
                          <div className="mt-3 flex flex-wrap gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-yellow-200 rounded"></div>
                              <span>Requested Day</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-blue-200 rounded"></div>
                              <span>Requested Night</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-orange-200 rounded"></div>
                              <span>PTO Request</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-gray-200 rounded"></div>
                              <span>No Schedule</span>
                            </div>
                          </div>
                        </div>

                        {/* Actual Schedule */}
                        <div>
                          <h4 className="font-medium mb-6 flex items-center gap-2 text-base">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Assigned Schedule
                          </h4>
                          <div className="border rounded-lg p-6 bg-green-50">
                            <div className="grid grid-cols-7 gap-2 mb-4">
                              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                                <div key={`day-${index}`} className="text-center text-xs font-medium text-gray-600 p-2">
                                  {day}
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                              {dateRange.map(date => {
                                const dateStr = format(date, 'yyyy-MM-dd')
                                const actualAssignments = schedule.assignments.filter(a => 
                                  a.nurseId === selectedNurse && a.date === dateStr
                                )
                                
                                return (
                                  <div
                                    key={dateStr}
                                    className="aspect-square p-1 text-xs border rounded bg-white flex flex-col items-center justify-center"
                                  >
                                    <div className="font-medium">{format(date, 'd')}</div>
                                    {actualAssignments.length > 0 ? (
                                      <div className="flex flex-col gap-0.5">
                                        {actualAssignments.map((assignment, idx) => (
                                          <div
                                            key={idx}
                                            className={`text-xs px-1 rounded ${
                                              assignment.shiftType === 'DAY' 
                                                ? 'bg-yellow-300 text-yellow-900' 
                                                : 'bg-blue-300 text-blue-900'
                                            }`}
                                          >
                                            {assignment.shiftType === 'DAY' ? 'D' : 'N'}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-gray-400">OFF</div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                          
                          {/* Legend */}
                          <div className="mt-3 flex flex-wrap gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-yellow-300 rounded"></div>
                              <span>Assigned Day</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-blue-300 rounded"></div>
                              <span>Assigned Night</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-gray-200 rounded"></div>
                              <span>Day Off</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Satisfaction Analysis */}
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-3">Preference Satisfaction Analysis</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {selectedNurse !== 'all' ? Math.round(calculateShiftPreferenceMatch(selectedNurse)) : '-'}%
                            </div>
                            <div className="text-gray-600">Shift Preference Match</div>
                          </div>
                          <div className="text-center">
                            {selectedNurse !== 'all' ? (
                              <>
                                <div className={`text-2xl font-bold ${calculatePTOViolations(selectedNurse).violations > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                  {Math.round(calculatePTOViolations(selectedNurse).percentage)}%
                                </div>
                                <div className="text-gray-600">PTO Requests Honored</div>
                                {calculatePTOViolations(selectedNurse).violations > 0 && (
                                  <div className="text-xs text-red-600 mt-1">
                                    {calculatePTOViolations(selectedNurse).violations} violation(s)
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="text-2xl font-bold text-gray-400">-%</div>
                                <div className="text-gray-600">PTO Requests Honored</div>
                              </>
                            )}
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {selectedNurse !== 'all' ? Math.round(getPreferenceSatisfactionForNurse(selectedNurse)) : '-'}%
                            </div>
                            <div className="text-gray-600">Overall Satisfaction</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Preference Analysis</CardTitle>
                    <CardDescription>
                      Select a specific nurse from the dropdown above to see detailed preference comparison
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {(schedule.preferenceScore * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Overall Preference Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {(schedule.coverageScore * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Coverage Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {(schedule.fairnessScore * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Fairness Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {schedule.assignments.length}
                        </div>
                        <div className="text-sm text-gray-600">Total Assignments</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="statistics" className="space-y-8 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <Users className="h-5 w-5" />
                      Nurse Workloads
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {nurses.map(nurse => {
                        const workload = schedule.statistics.nurseWorkloads[nurse.id] || 0
                        return (
                          <div key={nurse.id} className="flex justify-between items-center">
                            <span className="text-sm">{nurse.name}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${(workload / 15) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-8 text-right">
                                {workload}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <BarChart3 className="h-5 w-5" />
                      Schedule Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Assignments</span>
                        <span className="font-medium">{schedule.statistics.totalAssignments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Day Shifts</span>
                        <span className="font-medium">
                          {schedule.assignments.filter(a => a.shiftType === 'DAY').length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Night Shifts</span>
                        <span className="font-medium">
                          {schedule.assignments.filter(a => a.shiftType === 'NIGHT').length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Constraint Violations</span>
                        <span className={`font-medium ${schedule.violations.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {schedule.violations.length}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {schedule.violations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Constraint Violations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {schedule.violations.map((violation, index) => (
                        <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {violation}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="flex justify-end pt-8 mt-8 border-t">
            <Button onClick={onClose} className="px-8 py-3">Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}