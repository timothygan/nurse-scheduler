'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/ui/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { SchedulingRules } from '@/types/scheduling'
import { RuleConfigForm } from '@/components/scheduler/rule-config-form'

interface RuleData {
  blockId: string
  blockName: string
  blockStatus: string
  blockDates: {
    startDate: string
    endDate: string
  }
  rules: SchedulingRules
}

export default function RuleConfigurationPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const blockId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ruleData, setRuleData] = useState<RuleData | null>(null)
  const [rules, setRules] = useState<SchedulingRules | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (session?.user && blockId) {
      fetchRuleData()
    }
  }, [session, blockId])

  const fetchRuleData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/scheduling-blocks/${blockId}/rules`)
      
      if (response.ok) {
        const data = await response.json()
        setRuleData(data.data)
        setRules(data.data.rules)
        setHasChanges(false)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to load rule configuration')
        router.push('/dashboard/scheduler/blocks')
      }
    } catch (error) {
      console.error('Error fetching rule data:', error)
      toast.error('Failed to load rule configuration')
      router.push('/dashboard/scheduler/blocks')
    } finally {
      setLoading(false)
    }
  }

  const handleRulesChange = (updatedRules: SchedulingRules) => {
    setRules(updatedRules)
    setHasChanges(true)
  }

  const handleSaveRules = async () => {
    if (!rules || !blockId) return

    try {
      setSaving(true)
      const response = await fetch(`/api/scheduling-blocks/${blockId}/rules`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rules })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Rules updated successfully')
        setHasChanges(false)
        // Refresh rule data to get updated timestamp
        await fetchRuleData()
      } else {
        toast.error(data.error || 'Failed to update rules')
      }
    } catch (error) {
      console.error('Error saving rules:', error)
      toast.error('Failed to save rules')
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefaults = async () => {
    if (!blockId) return

    try {
      setSaving(true)
      const response = await fetch(`/api/scheduling-blocks/${blockId}/rules`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Rules reset to defaults')
        await fetchRuleData() // Refresh to show default rules
      } else {
        toast.error(data.error || 'Failed to reset rules')
      }
    } catch (error) {
      console.error('Error resetting rules:', error)
      toast.error('Failed to reset rules')
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800'
      case 'OPEN': return 'bg-green-100 text-green-800'
      case 'LOCKED': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="SCHEDULER">
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading rule configuration...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!ruleData || !rules) {
    return (
      <ProtectedRoute requiredRole="SCHEDULER">
        <DashboardLayout>
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Rule Configuration Not Found</h3>
            <p className="mt-2 text-gray-600">
              Unable to load rule configuration for this scheduling block.
            </p>
            <div className="mt-6">
              <Link href="/dashboard/scheduler/blocks">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Scheduling Blocks
                </Button>
              </Link>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  const canEdit = ruleData.blockStatus !== 'COMPLETED'

  return (
    <ProtectedRoute requiredRole="SCHEDULER">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-4">
                <Link href={`/dashboard/scheduler/blocks/${blockId}`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Schedule
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Rule Configuration</h1>
                  <p className="text-gray-600">{ruleData.blockName}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={getStatusColor(ruleData.blockStatus)}>
                {ruleData.blockStatus}
              </Badge>
              {hasChanges && (
                <div className="flex items-center text-amber-600 text-sm">
                  <AlertTriangle className="mr-1 h-4 w-4" />
                  Unsaved changes
                </div>
              )}
            </div>
          </div>

          {/* Status Warning */}
          {!canEdit && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="flex items-center space-x-3 pt-6">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-blue-800 font-medium">
                    This scheduling block is completed
                  </p>
                  <p className="text-blue-700 text-sm">
                    Rules cannot be modified for completed scheduling blocks.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {canEdit && (
            <div className="flex items-center justify-between">
              <div>
                <Button
                  variant="outline"
                  onClick={handleResetToDefaults}
                  disabled={saving}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Defaults
                </Button>
              </div>
              <div>
                <Button
                  onClick={handleSaveRules}
                  disabled={!hasChanges || saving}
                  className="min-w-[120px]"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Rules
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Rule Configuration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Scheduling Rules</CardTitle>
              <CardDescription>
                Configure hospital-specific scheduling constraints and requirements.
                {!canEdit && ' This configuration is read-only.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RuleConfigForm
                rules={rules}
                onChange={handleRulesChange}
                disabled={!canEdit}
                blockDates={ruleData.blockDates}
              />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}