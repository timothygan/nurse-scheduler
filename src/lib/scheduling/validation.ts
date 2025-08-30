import { SchedulingRules, ValidationResult } from '@/types/scheduling'
import { DayPreference } from '@/components/nurse/preference-calendar'
import { parseISO, isWeekend, differenceInDays } from 'date-fns'

export function validateNursePreferences(
  preferences: DayPreference[],
  rules: SchedulingRules,
  blockStartDate: string,
  blockEndDate: string
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Count preference types
  const workDays = preferences.filter(p => p.type === 'WORK')
  const ptoDays = preferences.filter(p => p.type === 'PTO')
  const noScheduleDays = preferences.filter(p => p.type === 'NO_SCHEDULE')
  
  // Total days in block
  const totalDays = differenceInDays(parseISO(blockEndDate), parseISO(blockStartDate)) + 1
  
  // 1. Check minimum shifts
  if (workDays.length < rules.minShiftsPerNurse) {
    errors.push(`You must be available for at least ${rules.minShiftsPerNurse} shifts. Currently selected: ${workDays.length}`)
  }
  
  // 2. Check maximum shifts
  if (workDays.length > rules.maxShiftsPerNurse) {
    errors.push(`You cannot work more than ${rules.maxShiftsPerNurse} shifts. Currently selected: ${workDays.length}`)
  }
  
  // 3. Check PTO limits
  if (ptoDays.length > rules.maxPTOPerNurse) {
    errors.push(`Maximum ${rules.maxPTOPerNurse} PTO days allowed. Currently selected: ${ptoDays.length}`)
  }
  
  // 4. Check no-schedule limits
  if (noScheduleDays.length > rules.maxNoSchedulePerNurse) {
    errors.push(`Maximum ${rules.maxNoSchedulePerNurse} no-schedule days allowed. Currently selected: ${noScheduleDays.length}`)
  }
  
  // 5. Check total time off
  const totalTimeOff = ptoDays.length + noScheduleDays.length
  if (totalTimeOff > rules.maxTotalTimeOff) {
    errors.push(`Maximum ${rules.maxTotalTimeOff} total days off allowed. Currently selected: ${totalTimeOff}`)
  }
  
  // 6. Check blackout dates
  if (rules.blackoutDates && rules.blackoutDates.length > 0) {
    const blackoutSet = new Set(rules.blackoutDates)
    const blackoutViolations = [...ptoDays, ...noScheduleDays].filter(p => blackoutSet.has(p.date))
    
    if (blackoutViolations.length > 0) {
      errors.push(`Time off not allowed on blackout dates: ${blackoutViolations.map(v => v.date).join(', ')}`)
    }
  }
  
  // 7. Check consecutive days
  const workDates = workDays.map(w => parseISO(w.date)).sort((a, b) => a.getTime() - b.getTime())
  
  if (workDates.length > 0) {
    let consecutiveCount = 1
    let maxConsecutive = 1
    
    for (let i = 1; i < workDates.length; i++) {
      const dayDiff = differenceInDays(workDates[i], workDates[i - 1])
      
      if (dayDiff === 1) {
        consecutiveCount++
        maxConsecutive = Math.max(maxConsecutive, consecutiveCount)
      } else {
        consecutiveCount = 1
      }
    }
    
    if (maxConsecutive > rules.maxConsecutiveDays) {
      errors.push(`Cannot work more than ${rules.maxConsecutiveDays} consecutive days`)
    }
    
    // Check if any work stretch is less than minimum consecutive days
    let currentStretch = 1
    for (let i = 1; i < workDates.length; i++) {
      const dayDiff = differenceInDays(workDates[i], workDates[i - 1])
      
      if (dayDiff === 1) {
        currentStretch++
      } else {
        if (currentStretch < rules.minConsecutiveDays && currentStretch > 0) {
          warnings.push(`Consider working at least ${rules.minConsecutiveDays} consecutive days when scheduled`)
        }
        currentStretch = 1
      }
    }
  }
  
  // 8. Check weekend limits
  const weekendWorkDays = workDays.filter(w => isWeekend(parseISO(w.date)))
  const weekendCount = Math.ceil(weekendWorkDays.length / 2) // Approximate weekend count
  
  if (weekendCount > rules.maxWeekendsPerNurse) {
    errors.push(`Maximum ${rules.maxWeekendsPerNurse} weekends allowed. Currently selected: ${weekendCount}`)
  }
  
  // 9. Add warnings for coverage concerns
  if (workDays.length < rules.minShiftsPerNurse + 2) {
    warnings.push('Consider adding more available days for better schedule flexibility')
  }
  
  // 10. Check for good distribution
  const unassignedDays = totalDays - workDays.length - ptoDays.length - noScheduleDays.length
  if (unassignedDays > totalDays * 0.5) {
    warnings.push(`You have ${unassignedDays} unassigned days. Consider marking more preferences.`)
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

export function getRequirementsDisplay(rules: SchedulingRules): string[] {
  const requirements: string[] = []
  
  requirements.push(`• Work ${rules.minShiftsPerNurse}-${rules.maxShiftsPerNurse} shifts`)
  requirements.push(`• Maximum ${rules.maxConsecutiveDays} consecutive days`)
  requirements.push(`• Maximum ${rules.maxPTOPerNurse} PTO days`)
  requirements.push(`• Maximum ${rules.maxNoSchedulePerNurse} no-schedule days`)
  requirements.push(`• Maximum ${rules.maxTotalTimeOff} total days off`)
  
  if (rules.maxWeekendsPerNurse > 0) {
    requirements.push(`• Maximum ${rules.maxWeekendsPerNurse} weekends`)
  }
  
  if (rules.blackoutDates && rules.blackoutDates.length > 0) {
    requirements.push(`• No time off on blackout dates`)
  }
  
  if (rules.requireAlternatingWeekends) {
    requirements.push(`• Must alternate weekends`)
  }
  
  return requirements
}