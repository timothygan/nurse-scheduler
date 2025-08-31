'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/ui/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  Mail,
  Award,
  Calendar,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface Nurse {
  id: string
  name: string
  email: string
  qualifications: string[]
  seniorityLevel: number
  createdAt: string
  _count?: {
    shifts: number
  }
}

export default function NursesManagementPage() {
  const [nurses, setNurses] = useState<Nurse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const nursesPerPage = 10
  const { toast } = useToast()

  useEffect(() => {
    fetchNurses()
  }, [])

  const fetchNurses = async () => {
    try {
      const response = await fetch('/api/nurses')
      if (!response.ok) throw new Error('Failed to fetch nurses')
      const data = await response.json()
      setNurses(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load nurses',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNurse = async (nurseId: string) => {
    if (!confirm('Are you sure you want to delete this nurse?')) return

    try {
      const response = await fetch(`/api/nurses/${nurseId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete nurse')
      
      toast({
        title: 'Success',
        description: 'Nurse deleted successfully',
      })
      fetchNurses()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete nurse',
        variant: 'destructive',
      })
    }
  }

  // Filter nurses based on search term
  const filteredNurses = Array.isArray(nurses) ? nurses.filter(nurse =>
    nurse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nurse.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) : []

  // Pagination
  const indexOfLastNurse = currentPage * nursesPerPage
  const indexOfFirstNurse = indexOfLastNurse - nursesPerPage
  const currentNurses = filteredNurses.slice(indexOfFirstNurse, indexOfLastNurse)
  const totalPages = Math.ceil(filteredNurses.length / nursesPerPage)

  const getSeniorityBadge = (level: number) => {
    const badges = {
      1: { label: 'Junior', className: 'bg-blue-100 text-blue-800' },
      2: { label: 'Mid-Level', className: 'bg-green-100 text-green-800' },
      3: { label: 'Senior', className: 'bg-purple-100 text-purple-800' },
      4: { label: 'Lead', className: 'bg-orange-100 text-orange-800' },
      5: { label: 'Principal', className: 'bg-red-100 text-red-800' }
    }
    return badges[level as keyof typeof badges] || badges[1]
  }

  return (
    <ProtectedRoute requiredRole="SCHEDULER">
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Nurse Management</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage nurse profiles, qualifications, and seniority levels
                </p>
              </div>
              <Button asChild>
                <Link href="/dashboard/scheduler/nurses/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Nurse
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600 mr-4" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Nurses</p>
                    <p className="text-2xl font-semibold text-gray-900">{Array.isArray(nurses) ? nurses.length : 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Award className="h-8 w-8 text-green-600 mr-4" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Senior Staff</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {Array.isArray(nurses) ? nurses.filter(n => n.seniorityLevel >= 3).length : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-purple-600 mr-4" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Avg. Shifts/Nurse</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {Array.isArray(nurses) && nurses.length > 0 
                        ? Math.round(nurses.reduce((acc, n) => acc + (n._count?.shifts || 0), 0) / nurses.length)
                        : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search nurses by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Nurses List */}
          <Card>
            <CardHeader>
              <CardTitle>All Nurses</CardTitle>
              <CardDescription>
                View and manage all registered nurses in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading nurses...</div>
              ) : currentNurses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No nurses found matching your search' : 'No nurses registered yet'}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nurse
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Seniority
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qualifications
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Shifts
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentNurses.map((nurse) => {
                          const seniorityBadge = getSeniorityBadge(nurse.seniorityLevel)
                          return (
                            <tr key={nurse.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {nurse.name}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <Mail className="h-3 w-3 mr-1" />
                                    {nurse.email}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className={seniorityBadge.className}>
                                  {seniorityBadge.label}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {nurse.qualifications.slice(0, 3).map((qual, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {qual}
                                    </Badge>
                                  ))}
                                  {nurse.qualifications.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{nurse.qualifications.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {nurse._count?.shifts || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                  >
                                    <Link href={`/dashboard/scheduler/nurses/${nurse.id}/edit`}>
                                      <Edit className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteNurse(nurse.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 sm:px-6 mt-4">
                      <div className="flex flex-1 justify-between sm:hidden">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{indexOfFirstNurse + 1}</span> to{' '}
                            <span className="font-medium">
                              {Math.min(indexOfLastNurse, filteredNurses.length)}
                            </span>{' '}
                            of <span className="font-medium">{filteredNurses.length}</span> nurses
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          {[...Array(totalPages)].map((_, idx) => (
                            <Button
                              key={idx + 1}
                              variant={currentPage === idx + 1 ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(idx + 1)}
                            >
                              {idx + 1}
                            </Button>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}