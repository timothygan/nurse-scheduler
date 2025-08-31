'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/ui/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Users, Settings } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { StatusDropdown } from '@/components/scheduler/status-dropdown'

interface SchedulingBlock {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  createdBy: {
    firstName: string
    lastName: string
    email: string
  }
  _count: {
    nursePreferences: number
    schedules: number
  }
}

export default function SchedulingBlocksPage() {
  const [blocks, setBlocks] = useState<SchedulingBlock[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchBlocks()
  }, [])

  const fetchBlocks = async () => {
    try {
      const response = await fetch('/api/scheduling-blocks')
      if (!response.ok) {
        throw new Error('Failed to fetch scheduling blocks')
      }
      const result = await response.json()
      setBlocks(result.data || [])
    } catch (error: any) {
      console.error('Fetch blocks error:', error)
      toast.error('Failed to load scheduling blocks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = (blockId: string, newStatus: string) => {
    setBlocks(blocks.map(block => 
      block.id === blockId 
        ? { ...block, status: newStatus }
        : block
    ))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800'
      case 'OPEN': return 'bg-blue-100 text-blue-800'
      case 'LOCKED': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const diffWeeks = Math.round(diffDays / 7)
    
    if (diffWeeks === 1) return '1 week'
    if (diffWeeks === 2) return '2 weeks'
    if (diffWeeks === 4) return '4 weeks'
    return `${diffDays} days`
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredRole="SCHEDULER">
        <DashboardLayout>
          <div className="px-4 py-6 sm:px-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="SCHEDULER">
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Scheduling Blocks</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage scheduling periods for your hospital
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/scheduler/blocks/new">
                <Plus className="mr-2 h-4 w-4" />
                New Block
              </Link>
            </Button>
          </div>

          {blocks.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduling blocks</h3>
                <p className="text-gray-600 mb-4">
                  Get started by creating your first scheduling block
                </p>
                <Button asChild>
                  <Link href="/dashboard/scheduler/blocks/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Block
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {blocks.map((block) => (
                <Card key={block.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{block.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {format(new Date(block.startDate), 'MMM d, yyyy')} - {format(new Date(block.endDate), 'MMM d, yyyy')} 
                          <span className="ml-2 text-gray-400">({calculateDuration(block.startDate, block.endDate)})</span>
                        </CardDescription>
                      </div>
                      <StatusDropdown
                        blockId={block.id}
                        currentStatus={block.status as any}
                        onStatusChange={(newStatus) => handleStatusChange(block.id, newStatus)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-6 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {block._count.nursePreferences} preferences
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {block._count.schedules} schedules
                        </div>
                        <div>
                          Created by {block.createdBy.firstName} {block.createdBy.lastName}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Link href={`/dashboard/scheduler/rules/${block.id}`}>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-1" />
                            Configure
                          </Button>
                        </Link>
                        <Link href={`/dashboard/scheduler/blocks/${block.id}`}>
                          <Button size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}