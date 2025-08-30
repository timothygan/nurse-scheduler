'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/ui/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SchedulingBlockForm } from '@/components/forms/scheduling-block-form'
import { toast } from 'sonner'

export default function NewSchedulingBlockPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (data: any) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/scheduling-blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          startDate: data.startDate.toISOString(),
          endDate: data.endDate.toISOString(),
          rules: {} // Default empty rules, will be configured later
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create scheduling block')
      }

      const result = await response.json()
      toast.success(result.message || 'Scheduling block created successfully')
      router.push('/dashboard/scheduler/blocks')
    } catch (error: any) {
      console.error('Create scheduling block error:', error)
      toast.error(error.message || 'Failed to create scheduling block')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute requiredRole="SCHEDULER">
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">New Scheduling Block</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create a new scheduling period with customizable duration
            </p>
          </div>

          <SchedulingBlockForm 
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}