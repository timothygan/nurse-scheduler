'use client'

import { ProtectedRoute } from '@/components/ui/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, Settings, Plus, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function SchedulerDashboard() {
  return (
    <ProtectedRoute requiredRole="SCHEDULER">
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Scheduler Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage scheduling blocks, nurse profiles, and review schedules
            </p>
          </div>

          {/* Quick Stats */}
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
                        Active Blocks
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">3</dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Nurses
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">24</dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Pending Schedules
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">2</dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Settings className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Coverage Rate
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">94%</dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Scheduling Blocks</CardTitle>
                <CardDescription>
                  Create and manage scheduling periods for your hospital
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <Button asChild>
                    <Link href="/dashboard/scheduler/blocks">
                      <Calendar className="mr-2 h-4 w-4" />
                      Manage Blocks
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/scheduler/blocks/new">
                      <Plus className="mr-2 h-4 w-4" />
                      New Block
                    </Link>
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Create customizable scheduling periods with hospital-specific rules and requirements.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nurse Management</CardTitle>
                <CardDescription>
                  Manage nurse profiles, qualifications, and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <Button asChild>
                    <Link href="/dashboard/scheduler/nurses">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Nurses
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/scheduler/nurses/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Nurse
                    </Link>
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Add new nurses, update qualifications, and manage seniority levels and shift preferences.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}