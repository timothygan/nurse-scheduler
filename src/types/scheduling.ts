// Scheduling Block Rules Types

export interface SchedulingRules {
  // Shift Requirements
  minShiftsPerNurse: number       // Minimum shifts each nurse must work
  maxShiftsPerNurse: number       // Maximum shifts each nurse can work
  minConsecutiveDays: number      // Minimum consecutive days when working
  maxConsecutiveDays: number      // Maximum consecutive days allowed
  minRestBetweenShifts: number    // Minimum hours between shifts
  
  // PTO/Time Off Rules
  maxPTOPerNurse: number          // Maximum PTO days per nurse
  maxNoSchedulePerNurse: number   // Maximum no-schedule days per nurse
  maxTotalTimeOff: number         // Max combined PTO + no-schedule days
  blackoutDates: string[]         // Dates where no PTO/time off allowed
  
  // Coverage Requirements
  requiredCoverage: {
    DAY: number                   // Required nurses per day shift
    NIGHT: number                 // Required nurses per night shift
    WEEKEND_DAY: number           // Weekend day shift requirements
    WEEKEND_NIGHT: number         // Weekend night shift requirements
  }
  
  // Weekend Rules
  maxWeekendsPerNurse: number     // Maximum weekend shifts per nurse
  requireAlternatingWeekends: boolean // Nurses must alternate weekends
  
  // Distribution Rules
  requireEvenDistribution: boolean // Try to distribute shifts evenly
  enableSeniorityBias: boolean    // Whether to factor in seniority at all
  seniorityBiasWeight: number     // 0-1, how much to favor senior nurses (only if enabled)
  
  // Validation Messages
  customMessages?: {
    [key: string]: string         // Custom validation messages for specific rules
  }
}

export const DEFAULT_SCHEDULING_RULES: SchedulingRules = {
  minShiftsPerNurse: 3,
  maxShiftsPerNurse: 12,
  minConsecutiveDays: 1,
  maxConsecutiveDays: 5,
  minRestBetweenShifts: 8,
  
  maxPTOPerNurse: 3,
  maxNoSchedulePerNurse: 2,
  maxTotalTimeOff: 4,
  blackoutDates: [],
  
  requiredCoverage: {
    DAY: 3,
    NIGHT: 2,
    WEEKEND_DAY: 2,
    WEEKEND_NIGHT: 2
  },
  
  maxWeekendsPerNurse: 2,
  requireAlternatingWeekends: false,
  
  requireEvenDistribution: true,
  enableSeniorityBias: false,
  seniorityBiasWeight: 0.3,
  
  customMessages: {}
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}