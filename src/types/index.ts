// Re-export Prisma types for convenience
import type {
  User,
  UserRole,
  Hospital,
  NurseProfile,
  ShiftType,
  SchedulingBlock,
  SchedulingBlockStatus,
  NursePreferences,
  Schedule,
  ScheduleStatus,
  ShiftAssignment,
} from '@/generated/prisma'

export type {
  User,
  UserRole,
  Hospital,
  NurseProfile,
  ShiftType,
  SchedulingBlock,
  SchedulingBlockStatus,
  NursePreferences,
  Schedule,
  ScheduleStatus,
  ShiftAssignment,
}

// Custom types for business logic
export interface SchedulingRules {
  minShiftsPerNurse: number
  maxShiftsPerNurse: number
  weekendRequirements?: {
    minWeekendsPerNurse?: number
    maxWeekendsPerNurse?: number
  }
  maxConsecutiveDays?: number
  requiredQualifications?: {
    [shiftType: string]: string[]
  }
  noScheduleDaysPolicy?: {
    maxNoScheduleDays: number
    seniorityPriority: boolean
  }
  ptoRules?: {
    maxPtoOverride: number
    requiresApproval: boolean
  }
}

export interface NurseWithProfile extends User {
  nurseProfile: NurseProfile | null
}

export interface SchedulingBlockWithDetails extends SchedulingBlock {
  hospital: Hospital
  createdBy: User
  nursePreferences: NursePreferences[]
  schedules: Schedule[]
  _count: {
    nursePreferences: number
    schedules: number
  }
}

export interface ScheduleWithAssignments extends Schedule {
  schedulingBlock: SchedulingBlock
  shiftAssignments: ShiftAssignment[]
}

export interface ShiftAssignmentWithDetails extends ShiftAssignment {
  nurse: User & { nurseProfile: NurseProfile | null }
  schedule: Schedule
}