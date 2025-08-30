'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { SchedulingRules, ValidationResult } from '@/types/scheduling'
import { getRequirementsDisplay } from '@/lib/scheduling/validation'

interface PreferenceRequirementsProps {
  rules: SchedulingRules
  validation: ValidationResult
  stats: {
    workDays: number
    ptoDays: number
    noScheduleDays: number
    unassignedDays: number
    totalDays: number
  }
}

export function PreferenceRequirements({ 
  rules, 
  validation,
  stats 
}: PreferenceRequirementsProps) {
  const requirements = getRequirementsDisplay(rules)
  
  // Calculate progress for key metrics
  const shiftProgress = (stats.workDays / rules.minShiftsPerNurse) * 100
  const ptoProgress = (stats.ptoDays / rules.maxPTOPerNurse) * 100
  const noScheduleProgress = (stats.noScheduleDays / rules.maxNoSchedulePerNurse) * 100
  
  return (
    <div className="space-y-4">
      {/* Validation Status */}
      <Card className={validation.valid ? 'border-green-500' : 'border-red-500'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {validation.valid ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Requirements Met
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                Requirements Not Met
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="space-y-2">
              {validation.errors.map((error, idx) => (
                <Alert key={idx} variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
          
          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="space-y-2">
              {validation.warnings.map((warning, idx) => (
                <Alert key={idx} className="border-yellow-500 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-900">{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
          
          {/* Success Message */}
          {validation.valid && validation.warnings.length === 0 && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                All requirements satisfied! Your preferences are ready to submit.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Progress Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Progress Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Shifts Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Work Shifts</span>
              <span className="font-medium">
                {stats.workDays} / {rules.minShiftsPerNurse}-{rules.maxShiftsPerNurse}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  stats.workDays < rules.minShiftsPerNurse ? 'bg-yellow-500' :
                  stats.workDays > rules.maxShiftsPerNurse ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(shiftProgress, 100)}%` }}
              />
            </div>
          </div>
          
          {/* PTO Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>PTO Days</span>
              <span className="font-medium">
                {stats.ptoDays} / {rules.maxPTOPerNurse}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  stats.ptoDays > rules.maxPTOPerNurse ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(ptoProgress, 100)}%` }}
              />
            </div>
          </div>
          
          {/* No Schedule Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>No Schedule Days</span>
              <span className="font-medium">
                {stats.noScheduleDays} / {rules.maxNoSchedulePerNurse}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  stats.noScheduleDays > rules.maxNoSchedulePerNurse ? 'bg-red-500' : 'bg-gray-500'
                }`}
                style={{ width: `${Math.min(noScheduleProgress, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Requirements List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Scheduling Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            {requirements.map((req, idx) => (
              <li key={idx}>{req}</li>
            ))}
          </ul>
          
          {/* Coverage Requirements */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Coverage Requirements:</p>
            <div className="grid grid-cols-2 gap-2">
              <Badge variant="outline">Day: {rules.requiredCoverage.DAY} nurses</Badge>
              <Badge variant="outline">Night: {rules.requiredCoverage.NIGHT} nurses</Badge>
              <Badge variant="outline">Weekend Day: {rules.requiredCoverage.WEEKEND_DAY}</Badge>
              <Badge variant="outline">Weekend Night: {rules.requiredCoverage.WEEKEND_NIGHT}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}