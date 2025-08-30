'use client'

import { ProtectedRoute } from '@/components/ui/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function NurseDashboard() {
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
                        Current Period
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">Week 3/4</dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Hours This Period
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">76</dd>
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
                        Preferences Due
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">3 days</dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Schedule Status
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">Approved</dd>
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
                <CardTitle>Schedule Preferences</CardTitle>
                <CardDescription>
                  Submit your preferences for upcoming scheduling blocks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <Button>
                    <Calendar className="mr-2 h-4 w-4" />
                    Submit Preferences
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Set your preferred shifts, PTO requests, and no-schedule days for the next scheduling period.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Schedule</CardTitle>
                <CardDescription>
                  View your current and upcoming shift assignments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <Button variant="outline">
                    <Clock className="mr-2 h-4 w-4" />
                    View Schedule
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Check your current schedule, upcoming shifts, and any recent changes or updates.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}