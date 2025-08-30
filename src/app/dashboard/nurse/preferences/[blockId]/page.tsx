'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/ui/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { PreferenceCalendar, type PreferenceType, type DayPreference } from '@/components/nurse/preference-calendar'
import { Calendar as CalendarIcon, Save, ArrowLeft, Info } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import Link from 'next/link'

interface SchedulingBlock {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  hospital: string
  createdBy: string
}

interface NurseProfile {
  shiftTypes: string[]
}

interface NursePreferences {
  id?: string
  preferredShifts: Record<string, string>
  ptoRequests: string[]
  noScheduleRequests: string[]
  flexibilityScore: number
  submittedAt?: string
}

export default function PreferenceSubmissionPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const blockId = params.blockId as string

  const [schedulingBlock, setSchedulingBlock] = useState<SchedulingBlock | null>(null)
  const [nurseProfile, setNurseProfile] = useState<NurseProfile | null>(null)
  const [preferences, setPreferences] = useState<NursePreferences>({
    preferredShifts: {},
    ptoRequests: [],
    noScheduleRequests: [],
    flexibilityScore: 5
  })
  const [dayPreferences, setDayPreferences] = useState<DayPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch scheduling block details
        const blockResponse = await fetch(`/api/scheduling-blocks/${blockId}`)
        if (blockResponse.ok) {
          const blockData = await blockResponse.json()
          setSchedulingBlock(blockData.block)
        }

        // Fetch nurse profile to get shift types
        const profileResponse = await fetch('/api/nurse/profile')
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setNurseProfile(profileData.profile)
        }

        // Fetch existing preferences if any
        const preferencesResponse = await fetch(`/api/nurse-preferences?blockId=${blockId}`)
        if (preferencesResponse.ok) {
          const preferencesData = await preferencesResponse.json()
          if (preferencesData.preferences) {
            setPreferences(preferencesData.preferences)
            
            // Convert existing preferences to DayPreference format
            const converted: DayPreference[] = []
            
            // Add work days
            Object.entries(preferencesData.preferences.preferredShifts || {}).forEach(([date, shiftType]) => {
              if (shiftType && shiftType !== 'ANY') {
                converted.push({
                  date,
                  type: 'WORK',
                  shiftType: shiftType as 'DAY' | 'NIGHT' | 'ANY'
                })
              }
            })
            
            // Add PTO days
            (preferencesData.preferences.ptoRequests || []).forEach((date: string) => {
              converted.push({ date, type: 'PTO' })
            })
            
            // Add no-schedule days
            (preferencesData.preferences.noScheduleRequests || []).forEach((date: string) => {
              converted.push({ date, type: 'NO_SCHEDULE' })
            })
            
            setDayPreferences(converted)
          }
        }
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

  const handlePreferencesChange = (newPreferences: DayPreference[]) => {
    setDayPreferences(newPreferences)
    
    // Convert to the format expected by the API
    const preferredShifts: Record<string, string> = {}
    const ptoRequests: string[] = []
    const noScheduleRequests: string[] = []
    
    newPreferences.forEach(pref => {
      if (pref.type === 'WORK') {
        preferredShifts[pref.date] = pref.shiftType || 'ANY'
      } else if (pref.type === 'PTO') {
        ptoRequests.push(pref.date)
      } else if (pref.type === 'NO_SCHEDULE') {
        noScheduleRequests.push(pref.date)
      }
    })
    
    setPreferences(prev => ({
      ...prev,
      preferredShifts,
      ptoRequests,
      noScheduleRequests
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/nurse-preferences', {
        method: preferences.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...preferences,
          schedulingBlockId: blockId
        })
      })

      if (response.ok) {
        toast.success('Preferences saved successfully!')
        router.push('/dashboard/nurse')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save preferences')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast.error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="NURSE">
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
      <ProtectedRoute requiredRole="NURSE">
        <DashboardLayout>
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Scheduling block not found</h3>
            <p className="mt-2 text-gray-600">This scheduling block may no longer be available.</p>
            <Link href="/dashboard/nurse">
              <Button className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  // Parse shift types from nurse profile (stored as JSON string in SQLite)
  const availableShiftTypes = nurseProfile?.shiftTypes 
    ? (typeof nurseProfile.shiftTypes === 'string' 
        ? JSON.parse(nurseProfile.shiftTypes) 
        : nurseProfile.shiftTypes) as ('DAY' | 'NIGHT')[]
    : ['DAY', 'NIGHT']

  return (
    <ProtectedRoute requiredRole="NURSE">
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Link href="/dashboard/nurse">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{schedulingBlock.name}</h1>
            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
              <span>{format(parseISO(schedulingBlock.startDate), 'MMM d')} - {format(parseISO(schedulingBlock.endDate), 'MMM d, yyyy')}</span>
              <span>•</span>
              <span>{schedulingBlock.hospital}</span>
              <span>•</span>
              <span>Created by {schedulingBlock.createdBy}</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Calendar Section */}
            <div className="lg:col-span-2">
              <PreferenceCalendar
                startDate={schedulingBlock.startDate}
                endDate={schedulingBlock.endDate}
                preferences={dayPreferences}
                onPreferencesChange={handlePreferencesChange}
                availableShiftTypes={availableShiftTypes}
                disabled={saving}
              />
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              {/* Flexibility Score */}
              <Card>
                <CardHeader>
                  <CardTitle>Flexibility Score</CardTitle>
                  <CardDescription>
                    How flexible are you with schedule changes?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Score: {preferences.flexibilityScore}</Label>
                    </div>
                    <Slider
                      value={[preferences.flexibilityScore]}
                      onValueChange={(value) => setPreferences(prev => ({ ...prev, flexibilityScore: value[0] }))}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                      disabled={saving}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Very Rigid</span>
                      <span>Very Flexible</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    How to Use
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Select a preference type above the calendar</li>
                    <li>• Click on dates to apply that preference</li>
                    <li>• Click again to remove a preference</li>
                    <li>• Blue = Available to work</li>
                    <li>• Green = PTO request</li>
                    <li>• Gray = No schedule day</li>
                    {availableShiftTypes.length > 1 && (
                      <li>• For work days, you can specify shift preference (Day/Night/Any)</li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* Your Shift Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Shift Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {availableShiftTypes.map(type => (
                      <span key={type} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {type}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    These are the shift types you're qualified for based on your profile.
                  </p>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Link href="/dashboard/nurse" className="flex-1">
                  <Button variant="outline" className="w-full" disabled={saving}>
                    Cancel
                  </Button>
                </Link>
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}