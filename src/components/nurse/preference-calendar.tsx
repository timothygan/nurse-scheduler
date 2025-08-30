'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, eachDayOfInterval, parseISO, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Briefcase, Palmtree, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type PreferenceType = 'WORK' | 'PTO' | 'NO_SCHEDULE' | null

export interface DayPreference {
  date: string
  type: PreferenceType
  shiftType?: 'DAY' | 'NIGHT' | 'ANY'
}

interface PreferenceCalendarProps {
  startDate: string
  endDate: string
  preferences: DayPreference[]
  onPreferencesChange: (preferences: DayPreference[]) => void
  availableShiftTypes: ('DAY' | 'NIGHT')[]
  disabled?: boolean
}

export function PreferenceCalendar({
  startDate,
  endDate,
  preferences,
  onPreferencesChange,
  availableShiftTypes,
  disabled = false
}: PreferenceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(parseISO(startDate))
  const [selectedType, setSelectedType] = useState<PreferenceType>('WORK')
  const [selectedShiftType, setSelectedShiftType] = useState<'DAY' | 'NIGHT' | 'ANY'>(
    availableShiftTypes.length === 1 ? availableShiftTypes[0] : 'ANY'
  )

  // Get all days in the current month view
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Get valid scheduling block days
  const validDays = useMemo(() => {
    return eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate)
    })
  }, [startDate, endDate])

  const handleDayClick = (date: Date) => {
    if (disabled) return
    
    const dateStr = format(date, 'yyyy-MM-dd')
    const isValidDay = validDays.some(d => isSameDay(d, date))
    
    if (!isValidDay) return

    const existingIndex = preferences.findIndex(p => p.date === dateStr)
    const newPreferences = [...preferences]

    if (existingIndex >= 0) {
      // If clicking on same type, remove it
      if (preferences[existingIndex].type === selectedType) {
        newPreferences.splice(existingIndex, 1)
      } else {
        // Otherwise, update to new type
        newPreferences[existingIndex] = {
          date: dateStr,
          type: selectedType,
          shiftType: selectedType === 'WORK' ? selectedShiftType : undefined
        }
      }
    } else {
      // Add new preference
      newPreferences.push({
        date: dateStr,
        type: selectedType,
        shiftType: selectedType === 'WORK' ? selectedShiftType : undefined
      })
    }

    onPreferencesChange(newPreferences)
  }

  const getPreferenceForDate = (date: Date): DayPreference | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return preferences.find(p => p.date === dateStr)
  }

  const getDayClassName = (date: Date) => {
    const isValidDay = validDays.some(d => isSameDay(d, date))
    const preference = getPreferenceForDate(date)
    
    return cn(
      'h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground',
      !isValidDay && 'text-muted-foreground opacity-50 cursor-not-allowed',
      isValidDay && !preference && 'hover:bg-gray-100',
      preference?.type === 'WORK' && 'bg-blue-500 text-white hover:bg-blue-600',
      preference?.type === 'PTO' && 'bg-green-500 text-white hover:bg-green-600',
      preference?.type === 'NO_SCHEDULE' && 'bg-gray-400 text-white hover:bg-gray-500'
    )
  }

  const getStats = () => {
    const workDays = preferences.filter(p => p.type === 'WORK').length
    const ptoDays = preferences.filter(p => p.type === 'PTO').length
    const noScheduleDays = preferences.filter(p => p.type === 'NO_SCHEDULE').length
    const totalDays = validDays.length
    const unassignedDays = totalDays - workDays - ptoDays - noScheduleDays

    return { workDays, ptoDays, noScheduleDays, unassignedDays, totalDays }
  }

  const stats = getStats()

  return (
    <div className="space-y-4">
      {/* Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Selection Mode</CardTitle>
          <CardDescription>
            Choose what type of preference to apply when clicking on dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={selectedType === 'WORK' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('WORK')}
                disabled={disabled}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                Available to Work
              </Button>
              <Button
                variant={selectedType === 'PTO' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('PTO')}
                disabled={disabled}
              >
                <Palmtree className="mr-2 h-4 w-4" />
                PTO Request
              </Button>
              <Button
                variant={selectedType === 'NO_SCHEDULE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('NO_SCHEDULE')}
                disabled={disabled}
              >
                <X className="mr-2 h-4 w-4" />
                No Schedule
              </Button>
            </div>

            {/* Shift Type Selection (only for WORK) */}
            {selectedType === 'WORK' && availableShiftTypes.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Preferred Shift:</span>
                <div className="flex gap-1">
                  <Button
                    variant={selectedShiftType === 'ANY' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedShiftType('ANY')}
                    disabled={disabled}
                  >
                    Any
                  </Button>
                  {availableShiftTypes.includes('DAY') && (
                    <Button
                      variant={selectedShiftType === 'DAY' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedShiftType('DAY')}
                      disabled={disabled}
                    >
                      Day
                    </Button>
                  )}
                  {availableShiftTypes.includes('NIGHT') && (
                    <Button
                      variant={selectedShiftType === 'NIGHT' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedShiftType('NIGHT')}
                      disabled={disabled}
                    >
                      Night
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                disabled={disabled}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                disabled={disabled}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-xs font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {monthDays.map((date, index) => {
              const isValidDay = validDays.some(d => isSameDay(d, date))
              const preference = getPreferenceForDate(date)
              
              return (
                <Button
                  key={index}
                  variant="ghost"
                  className={getDayClassName(date)}
                  onClick={() => handleDayClick(date)}
                  disabled={!isValidDay || disabled}
                >
                  <div className="flex flex-col items-center">
                    <span>{format(date, 'd')}</span>
                    {preference?.shiftType && preference.type === 'WORK' && (
                      <span className="text-[10px]">
                        {preference.shiftType === 'DAY' ? 'D' : preference.shiftType === 'NIGHT' ? 'N' : 'A'}
                      </span>
                    )}
                  </div>
                </Button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded" />
                <span>Available to Work</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span>PTO Request</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-400 rounded" />
                <span>No Schedule</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Work Days</p>
              <p className="text-2xl font-bold text-blue-600">{stats.workDays}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">PTO Days</p>
              <p className="text-2xl font-bold text-green-600">{stats.ptoDays}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">No Schedule</p>
              <p className="text-2xl font-bold text-gray-600">{stats.noScheduleDays}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unassigned</p>
              <p className="text-2xl font-bold text-orange-600">{stats.unassignedDays}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Days</p>
              <p className="text-2xl font-bold">{stats.totalDays}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}