'use client'

import { useState } from 'react'
import { SchedulingRules } from '@/types/scheduling'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// Simplified switch and separator components
const Switch = ({ checked, onCheckedChange, disabled }: { 
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean 
}) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    disabled={disabled}
    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
  />
)

const Separator = ({ className }: { className?: string }) => (
  <hr className={`border-gray-200 ${className}`} />
)
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  Calendar, 
  Users, 
  Moon, 
  Sun, 
  Plus, 
  X,
  Info,
  AlertTriangle 
} from 'lucide-react'

interface RuleConfigFormProps {
  rules: SchedulingRules
  onChange: (rules: SchedulingRules) => void
  disabled?: boolean
  blockDates: {
    startDate: string
    endDate: string
  }
}

export function RuleConfigForm({ rules, onChange, disabled = false, blockDates }: RuleConfigFormProps) {
  const [newBlackoutDate, setNewBlackoutDate] = useState('')

  const updateRule = (key: keyof SchedulingRules, value: any) => {
    onChange({
      ...rules,
      [key]: value
    })
  }

  const updateCoverageRule = (shiftType: string, value: number) => {
    updateRule('requiredCoverage', {
      ...(rules.requiredCoverage || {}),
      [shiftType]: value
    })
  }

  const addBlackoutDate = () => {
    if (newBlackoutDate && !(rules.blackoutDates || []).includes(newBlackoutDate)) {
      updateRule('blackoutDates', [...(rules.blackoutDates || []), newBlackoutDate])
      setNewBlackoutDate('')
    }
  }

  const removeBlackoutDate = (dateToRemove: string) => {
    updateRule('blackoutDates', (rules.blackoutDates || []).filter(date => date !== dateToRemove))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Shift Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Shift Requirements
          </CardTitle>
          <CardDescription>
            Configure minimum and maximum shift requirements per nurse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minShifts">Minimum Shifts per Nurse</Label>
              <Input
                id="minShifts"
                type="number"
                min="0"
                max="20"
                value={rules.minShiftsPerNurse || 0}
                onChange={(e) => updateRule('minShiftsPerNurse', parseInt(e.target.value) || 0)}
                disabled={disabled}
              />
              <p className="text-sm text-gray-500">
                Minimum number of shifts each nurse must work
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxShifts">Maximum Shifts per Nurse</Label>
              <Input
                id="maxShifts"
                type="number"
                min="0"
                max="30"
                value={rules.maxShiftsPerNurse || 0}
                onChange={(e) => updateRule('maxShiftsPerNurse', parseInt(e.target.value) || 0)}
                disabled={disabled}
              />
              <p className="text-sm text-gray-500">
                Maximum number of shifts each nurse can work
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minConsecutive">Minimum Consecutive Days</Label>
              <Input
                id="minConsecutive"
                type="number"
                min="1"
                max="7"
                value={rules.minConsecutiveDays || 0}
                onChange={(e) => updateRule('minConsecutiveDays', parseInt(e.target.value) || 1)}
                disabled={disabled}
              />
              <p className="text-sm text-gray-500">
                Minimum consecutive days when working
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxConsecutive">Maximum Consecutive Days</Label>
              <Input
                id="maxConsecutive"
                type="number"
                min="1"
                max="14"
                value={rules.maxConsecutiveDays || 0}
                onChange={(e) => updateRule('maxConsecutiveDays', parseInt(e.target.value) || 1)}
                disabled={disabled}
              />
              <p className="text-sm text-gray-500">
                Maximum consecutive days allowed
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minRest">Minimum Rest Between Shifts (hours)</Label>
            <Input
              id="minRest"
              type="number"
              min="4"
              max="24"
              value={rules.minRestBetweenShifts || 0}
              onChange={(e) => updateRule('minRestBetweenShifts', parseInt(e.target.value) || 8)}
              disabled={disabled}
            />
            <p className="text-sm text-gray-500">
              Minimum hours of rest required between shifts
            </p>
          </div>

          {/* Validation warnings */}
          {rules.minShiftsPerNurse > rules.maxShiftsPerNurse && (
            <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Minimum shifts cannot exceed maximum shifts</span>
            </div>
          )}
          {rules.minConsecutiveDays > rules.maxConsecutiveDays && (
            <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Minimum consecutive days cannot exceed maximum</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Off Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Time Off Rules
          </CardTitle>
          <CardDescription>
            Configure PTO and no-schedule day limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxPTO">Max PTO Days per Nurse</Label>
              <Input
                id="maxPTO"
                type="number"
                min="0"
                max="10"
                value={rules.maxPTOPerNurse || 0}
                onChange={(e) => updateRule('maxPTOPerNurse', parseInt(e.target.value) || 0)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxNoSchedule">Max No-Schedule Days</Label>
              <Input
                id="maxNoSchedule"
                type="number"
                min="0"
                max="10"
                value={rules.maxNoSchedulePerNurse || 0}
                onChange={(e) => updateRule('maxNoSchedulePerNurse', parseInt(e.target.value) || 0)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTotalTimeOff">Max Total Time Off</Label>
              <Input
                id="maxTotalTimeOff"
                type="number"
                min="0"
                max="15"
                value={rules.maxTotalTimeOff || 0}
                onChange={(e) => updateRule('maxTotalTimeOff', parseInt(e.target.value) || 0)}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Blackout Dates */}
          <div className="space-y-3">
            <Label>Blackout Dates</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                value={newBlackoutDate}
                onChange={(e) => setNewBlackoutDate(e.target.value)}
                disabled={disabled}
                min={blockDates.startDate.split('T')[0]}
                max={blockDates.endDate.split('T')[0]}
              />
              <Button
                type="button"
                size="sm"
                onClick={addBlackoutDate}
                disabled={disabled || !newBlackoutDate}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(rules.blackoutDates || []).map((date, index) => (
                <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                  <span>{formatDate(date)}</span>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-red-100"
                      onClick={() => removeBlackoutDate(date)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              Dates where no PTO or time-off requests are allowed
            </p>
          </div>

          {/* Validation warning */}
          {rules.maxTotalTimeOff < Math.max(rules.maxPTOPerNurse, rules.maxNoSchedulePerNurse) && (
            <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                Total time off limit should be at least as high as individual PTO or no-schedule limits
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coverage Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Coverage Requirements
          </CardTitle>
          <CardDescription>
            Set required nurse coverage for each shift type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center">
                <Sun className="mr-2 h-4 w-4 text-yellow-500" />
                Day Shifts
              </Label>
              <Input
                type="number"
                min="0"
                max="20"
                value={rules.requiredCoverage?.DAY || 0}
                onChange={(e) => updateCoverageRule('DAY', parseInt(e.target.value) || 0)}
                disabled={disabled}
              />
              <p className="text-sm text-gray-500">
                Required nurses per day shift
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center">
                <Moon className="mr-2 h-4 w-4 text-blue-500" />
                Night Shifts
              </Label>
              <Input
                type="number"
                min="0"
                max="20"
                value={rules.requiredCoverage?.NIGHT || 0}
                onChange={(e) => updateCoverageRule('NIGHT', parseInt(e.target.value) || 0)}
                disabled={disabled}
              />
              <p className="text-sm text-gray-500">
                Required nurses per night shift
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weekend Day Shifts</Label>
              <Input
                type="number"
                min="0"
                max="20"
                value={rules.requiredCoverage?.WEEKEND_DAY || 0}
                onChange={(e) => updateCoverageRule('WEEKEND_DAY', parseInt(e.target.value) || 0)}
                disabled={disabled}
              />
              <p className="text-sm text-gray-500">
                Required nurses for weekend day shifts
              </p>
            </div>
            <div className="space-y-2">
              <Label>Weekend Night Shifts</Label>
              <Input
                type="number"
                min="0"
                max="20"
                value={rules.requiredCoverage?.WEEKEND_NIGHT || 0}
                onChange={(e) => updateCoverageRule('WEEKEND_NIGHT', parseInt(e.target.value) || 0)}
                disabled={disabled}
              />
              <p className="text-sm text-gray-500">
                Required nurses for weekend night shifts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekend Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Weekend Rules</CardTitle>
          <CardDescription>
            Configure weekend-specific scheduling constraints
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="minWeekends">Minimum Weekends per Nurse</Label>
            <Input
              id="minWeekends"
              type="number"
              min="0"
              max="10"
              value={rules.minWeekendsPerNurse || 0}
              onChange={(e) => updateRule('minWeekendsPerNurse', parseInt(e.target.value) || 0)}
              disabled={disabled}
            />
            <p className="text-sm text-gray-500">
              Minimum number of weekends each nurse must work
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={rules.requireAlternatingWeekends || false}
              onCheckedChange={(checked) => updateRule('requireAlternatingWeekends', checked)}
              disabled={disabled}
            />
            <Label>Require Alternating Weekends</Label>
          </div>
          <p className="text-sm text-gray-500">
            When enabled, nurses must alternate weekend assignments when possible
          </p>
        </CardContent>
      </Card>

      {/* Distribution & Optimization Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Distribution & Optimization</CardTitle>
          <CardDescription>
            Configure how shifts are distributed and optimized
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={rules.requireEvenDistribution || false}
              onCheckedChange={(checked) => updateRule('requireEvenDistribution', checked)}
              disabled={disabled}
            />
            <Label>Require Even Distribution</Label>
          </div>
          <p className="text-sm text-gray-500">
            Try to distribute shifts evenly among all nurses
          </p>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                checked={rules.enableSeniorityBias || false}
                onCheckedChange={(checked) => updateRule('enableSeniorityBias', checked)}
                disabled={disabled}
              />
              <Label>Enable Seniority Bias</Label>
            </div>
            <p className="text-sm text-gray-500">
              Whether to factor in seniority when assigning preferred shifts
            </p>

            {rules.enableSeniorityBias && (
              <div className="space-y-2 ml-6">
                <Label htmlFor="seniorityWeight">
                  Seniority Bias Weight ({Math.round(rules.seniorityBiasWeight * 100)}%)
                </Label>
                <Input
                  id="seniorityWeight"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={rules.seniorityBiasWeight || 0}
                  onChange={(e) => updateRule('seniorityBiasWeight', parseFloat(e.target.value))}
                  disabled={disabled}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Equal (0%)</span>
                  <span>Strong preference for senior nurses (100%)</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help Information */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex items-start space-x-3 pt-6">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="space-y-2">
            <p className="text-blue-800 font-medium">Configuration Tips</p>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Changes will apply to future schedule generations</li>
              <li>• Red warnings indicate invalid rule combinations</li>
              <li>• Seniority bias helps senior nurses get preferred shifts</li>
              <li>• Blackout dates prevent any time-off requests on those days</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}