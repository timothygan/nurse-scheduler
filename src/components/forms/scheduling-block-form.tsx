'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { toast } from 'sonner'
import { format, addDays, addWeeks, addMonths } from 'date-fns'

const schedulingBlockSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startDate: z.date(),
  endDate: z.date(),
  durationType: z.enum(['custom', '1week', '2weeks', '4weeks', '1month']),
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate']
})

type SchedulingBlockFormData = z.infer<typeof schedulingBlockSchema>

interface SchedulingBlockFormProps {
  onSubmit: (data: SchedulingBlockFormData) => Promise<void>
  isLoading?: boolean
}

export function SchedulingBlockForm({ onSubmit, isLoading }: SchedulingBlockFormProps) {
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [durationType, setDurationType] = useState<string>('4weeks')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<SchedulingBlockFormData>({
    resolver: zodResolver(schedulingBlockSchema),
    defaultValues: {
      durationType: '4weeks'
    }
  })

  const handleStartDateSelect = (date: Date | undefined) => {
    if (!date) return
    
    setStartDate(date)
    setValue('startDate', date)
    
    // Auto-calculate end date based on duration type
    let calculatedEndDate: Date
    
    switch (durationType) {
      case '1week':
        calculatedEndDate = addWeeks(date, 1)
        break
      case '2weeks':
        calculatedEndDate = addWeeks(date, 2)
        break
      case '4weeks':
        calculatedEndDate = addWeeks(date, 4)
        break
      case '1month':
        calculatedEndDate = addMonths(date, 1)
        break
      default:
        calculatedEndDate = addWeeks(date, 4) // Default to 4 weeks
    }
    
    calculatedEndDate = addDays(calculatedEndDate, -1) // End on the day before
    setEndDate(calculatedEndDate)
    setValue('endDate', calculatedEndDate)
  }

  const handleDurationTypeChange = (value: string) => {
    setDurationType(value)
    setValue('durationType', value as any)
    
    // Recalculate end date if start date is set
    if (startDate) {
      handleStartDateSelect(startDate)
    }
  }

  const onFormSubmit = async (data: SchedulingBlockFormData) => {
    try {
      await onSubmit(data)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create scheduling block')
    }
  }

  const getDurationDescription = () => {
    if (!startDate || !endDate) return ''
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const diffWeeks = Math.round(diffDays / 7)
    
    return `${diffDays} days (${diffWeeks} weeks)`
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Create Scheduling Block</CardTitle>
        <CardDescription>
          Set up a new scheduling period with customizable duration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Block Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Block Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., January 2024 Schedule"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Duration Type Selector */}
          <div className="space-y-2">
            <Label>Duration Type</Label>
            <Select value={durationType} onValueChange={handleDurationTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1week">1 Week</SelectItem>
                <SelectItem value="2weeks">2 Weeks</SelectItem>
                <SelectItem value="4weeks">4 Weeks (Standard)</SelectItem>
                <SelectItem value="1month">1 Month</SelectItem>
                <SelectItem value="custom">Custom Duration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateSelect}
                disabled={isLoading}
                className="rounded-md border"
              />
              {errors.startDate && (
                <p className="text-sm text-red-600">{errors.startDate.message}</p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>End Date</Label>
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => {
                  if (date) {
                    setEndDate(date)
                    setValue('endDate', date)
                  }
                }}
                disabled={(date) => {
                  if (durationType !== 'custom') return true
                  if (!startDate) return date < new Date()
                  return date <= startDate
                }}
                className="rounded-md border"
              />
              {errors.endDate && (
                <p className="text-sm text-red-600">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* Duration Summary */}
          {startDate && endDate && (
            <div className="p-4 bg-blue-50 rounded-md">
              <h4 className="font-medium text-blue-900">Scheduling Period Summary</h4>
              <div className="mt-2 text-sm text-blue-800">
                <p><strong>Start:</strong> {format(startDate, 'EEEE, MMMM d, yyyy')}</p>
                <p><strong>End:</strong> {format(endDate, 'EEEE, MMMM d, yyyy')}</p>
                <p><strong>Duration:</strong> {getDurationDescription()}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !startDate || !endDate}
            >
              {isLoading ? 'Creating...' : 'Create Scheduling Block'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}