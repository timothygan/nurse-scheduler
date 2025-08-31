'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { ChevronDown, CheckCircle, Lock, Play, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

type Status = 'DRAFT' | 'OPEN' | 'LOCKED' | 'COMPLETED'

interface StatusDropdownProps {
  blockId: string
  currentStatus: Status
  onStatusChange: (newStatus: Status) => void
  disabled?: boolean
}

const statusConfig = {
  DRAFT: { 
    label: 'Draft', 
    color: 'text-gray-600 bg-gray-100',
    icon: RotateCcw,
    description: 'Block is being configured'
  },
  OPEN: { 
    label: 'Open', 
    color: 'text-blue-600 bg-blue-100',
    icon: Play,
    description: 'Open for nurse preferences'
  },
  LOCKED: { 
    label: 'Locked', 
    color: 'text-yellow-600 bg-yellow-100',
    icon: Lock,
    description: 'Preferences locked, generating schedules'
  },
  COMPLETED: { 
    label: 'Completed', 
    color: 'text-green-600 bg-green-100',
    icon: CheckCircle,
    description: 'Schedule finalized'
  }
}

const validTransitions: Record<Status, Status[]> = {
  DRAFT: ['OPEN'],
  OPEN: ['LOCKED', 'DRAFT'],
  LOCKED: ['COMPLETED', 'OPEN'],
  COMPLETED: ['OPEN']
}

export function StatusDropdown({ blockId, currentStatus, onStatusChange, disabled = false }: StatusDropdownProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: Status) => {
    if (newStatus === currentStatus) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/scheduling-blocks/${blockId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message)
        onStatusChange(newStatus)
      } else {
        toast.error(data.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Status update error:', error)
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const getCurrentConfig = () => statusConfig[currentStatus]
  const getAvailableTransitions = () => validTransitions[currentStatus] || []

  const CurrentIcon = getCurrentConfig().icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled || isUpdating}
          className="min-w-24"
        >
          <CurrentIcon className="h-4 w-4 mr-2" />
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCurrentConfig().color}`}>
            {getCurrentConfig().label}
          </span>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b">
          Change Status
        </div>
        
        {getAvailableTransitions().map((status) => {
          const config = statusConfig[status]
          const StatusIcon = config.icon
          
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
              className="flex items-center space-x-2 py-2"
            >
              <StatusIcon className="h-4 w-4" />
              <div>
                <div className="font-medium">{config.label}</div>
                <div className="text-xs text-gray-500">{config.description}</div>
              </div>
            </DropdownMenuItem>
          )
        })}
        
        {getAvailableTransitions().length === 0 && (
          <div className="px-2 py-2 text-xs text-gray-500">
            No status changes available
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}