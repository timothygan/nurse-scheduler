'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ProtectedRoute } from '@/components/ui/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, AlertCircle, CheckCircle, Users, FileText } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface SchedulingBlock {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  hospital: string
  createdBy: string
  hasSubmittedPreferences: boolean
  submittedAt: string | null
  flexibilityScore: number | null
}

export default function NurseDashboard() {
  const { data: session } = useSession()
  const [schedulingBlocks, setSchedulingBlocks] = useState<SchedulingBlock[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSchedulingBlocks = async () => {
      try {
        const response = await fetch('/api/scheduling-blocks/available')
        if (response.ok) {
          const data = await response.json()
          setSchedulingBlocks(data.blocks)
        }
      } catch (error) {
        console.error('Error fetching scheduling blocks:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchSchedulingBlocks()
    }
  }, [session])
  return (
    <ProtectedRoute requiredRole="NURSE">
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Nurse Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              View your schedules, submit preferences, and manage your profile
            </p>
          </div>

          {/* Current Status */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Available Blocks
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? '...' : schedulingBlocks.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Submitted
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? '...' : schedulingBlocks.filter(b => b.hasSubmittedPreferences).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Pending
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? '...' : schedulingBlocks.filter(b => !b.hasSubmittedPreferences).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Hospital
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {schedulingBlocks[0]?.hospital || 'General Hospital'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Available Scheduling Blocks */}
          <Card>
            <CardHeader>
              <CardTitle>Available Scheduling Blocks</CardTitle>
              <CardDescription>
                Submit your preferences for upcoming scheduling periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading scheduling blocks...
                </div>
              ) : schedulingBlocks.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No scheduling blocks available</h3>
                  <p className="text-sm text-gray-600">
                    There are currently no open scheduling blocks for preference submission.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {schedulingBlocks.map((block) => (
                    <div key={block.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{block.name}</h3>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                            <span>{format(new Date(block.startDate), 'MMM d')} - {format(new Date(block.endDate), 'MMM d, yyyy')}</span>
                            <span>•</span>
                            <span>Created by {block.createdBy}</span>
                          </div>
                          {block.hasSubmittedPreferences && (
                            <div className="mt-2 flex items-center text-sm text-green-600">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Submitted {block.submittedAt ? format(new Date(block.submittedAt), 'MMM d, yyyy') : ''}
                              {block.flexibilityScore && ` • Flexibility: ${block.flexibilityScore}/10`}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <Link href={`/dashboard/nurse/preferences/${block.id}`}>
                            <Button variant={block.hasSubmittedPreferences ? "outline" : "default"}>
                              <FileText className="mr-2 h-4 w-4" />
                              {block.hasSubmittedPreferences ? 'Edit Preferences' : 'Submit Preferences'}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}