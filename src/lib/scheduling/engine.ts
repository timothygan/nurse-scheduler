/**
 * Nurse Scheduling Engine
 * 
 * This is the core constraint satisfaction solver for generating optimal nurse schedules.
 * It uses a multi-objective optimization approach to balance:
 * - Hard constraints (must be satisfied)
 * - Soft constraints (preferred but can be violated with penalty)
 * - Nurse preferences and seniority bias
 * - Coverage requirements and fairness
 */

import { SchedulingRules, ValidationResult } from '@/types/scheduling'
import { differenceInDays, parseISO, addDays, format, isWeekend } from 'date-fns'

// Core types for the scheduling engine
export interface NurseData {
  id: string
  name: string
  seniorityLevel: number
  shiftTypes: ('DAY' | 'NIGHT')[]
  maxShiftsPerBlock: number
  contractHoursPerWeek: number
  preferences?: {
    preferredShifts: Record<string, 'DAY' | 'NIGHT' | 'ANY'>
    ptoRequests: string[]
    noScheduleRequests: string[]
    flexibilityScore: number
  }
}

export interface ShiftRequirement {
  date: string
  shiftType: 'DAY' | 'NIGHT'
  requiredNurses: number
  assignedNurses: string[]
}

export interface ScheduleAssignment {
  nurseId: string
  date: string
  shiftType: 'DAY' | 'NIGHT'
}

export interface GeneratedSchedule {
  id: string
  assignments: ScheduleAssignment[]
  optimizationScore: number
  coverageScore: number
  preferenceScore: number
  fairnessScore: number
  seniorityScore: number
  violations: string[]
  statistics: {
    totalAssignments: number
    nurseWorkloads: Record<string, number>
    coverageMetrics: Record<string, number>
    preferenceSatisfaction: Record<string, number>
  }
}

export interface SchedulingContext {
  startDate: string
  endDate: string
  nurses: NurseData[]
  rules: SchedulingRules
  requirements: ShiftRequirement[]
}

/**
 * Main Scheduling Engine Class
 * 
 * This implements a hybrid constraint satisfaction approach:
 * 1. Generate initial feasible solutions using greedy assignment
 * 2. Apply local search optimization (hill climbing, simulated annealing)
 * 3. Use backtracking for constraint satisfaction
 * 4. Score solutions using multi-objective function
 */
export class SchedulingEngine {
  private context: SchedulingContext
  private assignments: Map<string, ScheduleAssignment[]> = new Map()
  
  constructor(context: SchedulingContext) {
    this.context = context
    this.initializeRequirements()
  }

  /**
   * Generate multiple schedule options
   * Returns array of valid schedules ranked by optimization score
   */
  async generateSchedules(options: {
    maxSchedules?: number
    maxIterations?: number
    optimizationStrategy?: 'balanced' | 'coverage' | 'preferences' | 'fairness'
  } = {}): Promise<GeneratedSchedule[]> {
    const { maxSchedules = 3, maxIterations = 1000, optimizationStrategy = 'balanced' } = options
    
    const schedules: GeneratedSchedule[] = []
    
    // Generate multiple schedule variants using different strategies
    for (let i = 0; i < maxSchedules; i++) {
      const schedule = await this.generateSingleSchedule(optimizationStrategy, maxIterations)
      if (schedule) {
        schedules.push(schedule)
      }
    }
    
    // Sort by optimization score (highest first)
    return schedules.sort((a, b) => b.optimizationScore - a.optimizationScore)
  }

  /**
   * Generate a single schedule using constraint satisfaction
   */
  private async generateSingleSchedule(
    strategy: 'balanced' | 'coverage' | 'preferences' | 'fairness',
    maxIterations: number
  ): Promise<GeneratedSchedule | null> {
    // Reset assignments
    this.assignments.clear()
    
    // Phase 1: Greedy initial assignment
    const initialSolution = this.createInitialSolution()
    if (!initialSolution) {
      return null
    }
    
    // Phase 2: Local search optimization
    const optimizedSolution = this.optimizeSolution(initialSolution, strategy, maxIterations)
    
    // Phase 3: Validation and scoring
    const schedule = this.createScheduleFromAssignments(optimizedSolution)
    
    return schedule
  }

  /**
   * Create initial feasible solution using greedy assignment
   */
  private createInitialSolution(): ScheduleAssignment[] | null {
    const assignments: ScheduleAssignment[] = []
    
    // Handle PTO and no-schedule requests first (hard constraints)
    this.blockUnavailableDates()
    
    // Sort requirements by difficulty (fewer available nurses = harder)
    const sortedRequirements = this.context.requirements.sort((a, b) => {
      const availableA = this.getAvailableNursesForShift(a.date, a.shiftType).length
      const availableB = this.getAvailableNursesForShift(b.date, b.shiftType).length
      return availableA - availableB
    })
    
    // Assign nurses to shifts using constraint satisfaction
    for (const requirement of sortedRequirements) {
      const assignment = this.assignNursesToShift(requirement)
      if (!assignment) {
        // Cannot satisfy this requirement - return null to indicate infeasible
        return null
      }
      assignments.push(...assignment)
    }
    
    return assignments
  }

  /**
   * Get nurses available for a specific shift
   */
  private getAvailableNursesForShift(date: string, shiftType: 'DAY' | 'NIGHT'): NurseData[] {
    return this.context.nurses.filter(nurse => {
      // Check if nurse can work this shift type
      if (!nurse.shiftTypes.includes(shiftType)) {
        return false
      }
      
      // Check PTO requests
      if (nurse.preferences?.ptoRequests.includes(date)) {
        return false
      }
      
      // Check no-schedule requests
      if (nurse.preferences?.noScheduleRequests.includes(date)) {
        return false
      }
      
      // Check if nurse is already assigned this date
      const nurseAssignments = this.assignments.get(nurse.id) || []
      if (nurseAssignments.some(a => a.date === date)) {
        return false
      }
      
      // Check consecutive days constraint
      if (!this.canAssignConsecutive(nurse.id, date)) {
        return false
      }
      
      // Check maximum shifts constraint
      if (nurseAssignments.length >= nurse.maxShiftsPerBlock) {
        return false
      }
      
      return true
    })
  }

  /**
   * Assign nurses to a specific shift requirement
   */
  private assignNursesToShift(requirement: ShiftRequirement): ScheduleAssignment[] | null {
    const available = this.getAvailableNursesForShift(requirement.date, requirement.shiftType)
    
    if (available.length < requirement.requiredNurses) {
      // Not enough nurses available - constraint cannot be satisfied
      return null
    }
    
    // Sort nurses by priority (seniority, preferences, fairness)
    const prioritizedNurses = this.prioritizeNurses(available, requirement.date, requirement.shiftType)
    
    // Assign top priority nurses
    const assignments: ScheduleAssignment[] = []
    for (let i = 0; i < requirement.requiredNurses; i++) {
      const nurse = prioritizedNurses[i]
      const assignment: ScheduleAssignment = {
        nurseId: nurse.id,
        date: requirement.date,
        shiftType: requirement.shiftType
      }
      
      assignments.push(assignment)
      
      // Update assignments map
      if (!this.assignments.has(nurse.id)) {
        this.assignments.set(nurse.id, [])
      }
      this.assignments.get(nurse.id)!.push(assignment)
    }
    
    return assignments
  }

  /**
   * Prioritize nurses for assignment based on multiple factors
   */
  private prioritizeNurses(
    nurses: NurseData[], 
    date: string, 
    shiftType: 'DAY' | 'NIGHT'
  ): NurseData[] {
    return nurses.sort((a, b) => {
      let scoreA = 0
      let scoreB = 0
      
      // Factor 1: Preference satisfaction
      const prefA = a.preferences?.preferredShifts[date]
      const prefB = b.preferences?.preferredShifts[date]
      
      if (prefA === shiftType || prefA === 'ANY') scoreA += 100
      if (prefB === shiftType || prefB === 'ANY') scoreB += 100
      
      // Factor 2: Seniority bias (only if enabled)
      if (this.context.rules.enableSeniorityBias) {
        const seniorityWeight = this.context.rules.seniorityBiasWeight
        scoreA += a.seniorityLevel * seniorityWeight * 50
        scoreB += b.seniorityLevel * seniorityWeight * 50
      }
      
      // Factor 3: Fairness (fewer assignments = higher priority)
      const assignmentsA = (this.assignments.get(a.id) || []).length
      const assignmentsB = (this.assignments.get(b.id) || []).length
      scoreA += (10 - assignmentsA) * 20
      scoreB += (10 - assignmentsB) * 20
      
      // Factor 4: Flexibility score
      scoreA += (a.preferences?.flexibilityScore || 5) * 10
      scoreB += (b.preferences?.flexibilityScore || 5) * 10
      
      return scoreB - scoreA // Higher score first
    })
  }

  /**
   * Check if nurse can be assigned consecutive days
   */
  private canAssignConsecutive(nurseId: string, date: string): boolean {
    const assignments = this.assignments.get(nurseId) || []
    const targetDate = parseISO(date)
    
    // Count consecutive days around this date
    let consecutiveCount = 1 // Count the proposed assignment
    
    // Check backwards
    let checkDate = addDays(targetDate, -1)
    while (assignments.some(a => a.date === format(checkDate, 'yyyy-MM-dd'))) {
      consecutiveCount++
      checkDate = addDays(checkDate, -1)
    }
    
    // Check forwards
    checkDate = addDays(targetDate, 1)
    while (assignments.some(a => a.date === format(checkDate, 'yyyy-MM-dd'))) {
      consecutiveCount++
      checkDate = addDays(checkDate, 1)
    }
    
    return consecutiveCount <= this.context.rules.maxConsecutiveDays
  }

  /**
   * Initialize shift requirements based on scheduling rules and date range
   */
  private initializeRequirements(): void {
    const requirements: ShiftRequirement[] = []
    const startDate = parseISO(this.context.startDate)
    const endDate = parseISO(this.context.endDate)
    const totalDays = differenceInDays(endDate, startDate) + 1
    
    // Generate requirements for each day in the scheduling period
    for (let i = 0; i < totalDays; i++) {
      const currentDate = addDays(startDate, i)
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      const isWeekendDay = isWeekend(currentDate)
      
      // Day shift requirement
      const dayRequirement: ShiftRequirement = {
        date: dateStr,
        shiftType: 'DAY',
        requiredNurses: isWeekendDay 
          ? this.context.rules.requiredCoverage.WEEKEND_DAY 
          : this.context.rules.requiredCoverage.DAY,
        assignedNurses: []
      }
      requirements.push(dayRequirement)
      
      // Night shift requirement
      const nightRequirement: ShiftRequirement = {
        date: dateStr,
        shiftType: 'NIGHT',
        requiredNurses: isWeekendDay 
          ? this.context.rules.requiredCoverage.WEEKEND_NIGHT 
          : this.context.rules.requiredCoverage.NIGHT,
        assignedNurses: []
      }
      requirements.push(nightRequirement)
    }
    
    this.context.requirements = requirements
  }
  
  /**
   * Block dates where nurses have PTO or no-schedule requests
   */
  private blockUnavailableDates(): void {
    // Create a map of blocked dates per nurse for quick lookup
    // This is used during constraint checking
    this.context.nurses.forEach(nurse => {
      const blockedDates = new Set([
        ...(nurse.preferences?.ptoRequests || []),
        ...(nurse.preferences?.noScheduleRequests || [])
      ])
      
      // Store blocked dates in the nurse data for constraint checking
      ;(nurse as any).blockedDates = blockedDates
    })
  }
  
  /**
   * Optimize solution using local search techniques
   */
  private optimizeSolution(
    solution: ScheduleAssignment[],
    strategy: 'balanced' | 'coverage' | 'preferences' | 'fairness',
    maxIterations: number
  ): ScheduleAssignment[] {
    let currentSolution = [...solution]
    let bestSolution = [...solution]
    let bestScore = this.calculateOptimizationScore(currentSolution, strategy)
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Generate neighbor solution using random swap or reassignment
      const neighborSolution = this.generateNeighborSolution(currentSolution)
      
      if (!neighborSolution) continue
      
      const neighborScore = this.calculateOptimizationScore(neighborSolution, strategy)
      
      // Accept better solutions (hill climbing)
      if (neighborScore > bestScore) {
        bestSolution = [...neighborSolution]
        bestScore = neighborScore
        currentSolution = [...neighborSolution]
      }
      // Simulated annealing: sometimes accept worse solutions to escape local optima
      else if (this.shouldAcceptWorseSolution(neighborScore, bestScore, iteration, maxIterations)) {
        currentSolution = [...neighborSolution]
      }
    }
    
    return bestSolution
  }
  
  /**
   * Generate a neighboring solution by making small changes
   */
  private generateNeighborSolution(solution: ScheduleAssignment[]): ScheduleAssignment[] | null {
    const neighbor = [...solution]
    
    // Strategy: Random swap between two assignments
    if (neighbor.length < 2) return null
    
    const idx1 = Math.floor(Math.random() * neighbor.length)
    const idx2 = Math.floor(Math.random() * neighbor.length)
    
    if (idx1 === idx2) return null
    
    // Swap nurse assignments if it doesn't violate constraints
    const assignment1 = neighbor[idx1]
    const assignment2 = neighbor[idx2]
    
    // Create swapped version
    const swapped = [...neighbor]
    swapped[idx1] = { ...assignment1, nurseId: assignment2.nurseId }
    swapped[idx2] = { ...assignment2, nurseId: assignment1.nurseId }
    
    // Validate the swap doesn't violate hard constraints
    if (this.validateAssignments(swapped)) {
      return swapped
    }
    
    return null
  }
  
  /**
   * Simulated annealing acceptance probability
   */
  private shouldAcceptWorseSolution(
    newScore: number, 
    currentScore: number, 
    iteration: number, 
    maxIterations: number
  ): boolean {
    const temperature = 1 - (iteration / maxIterations) // Temperature decreases over time
    const probability = Math.exp((newScore - currentScore) / temperature)
    return Math.random() < probability
  }
  
  /**
   * Validate that assignments don't violate hard constraints
   */
  private validateAssignments(assignments: ScheduleAssignment[]): boolean {
    // Group assignments by nurse
    const nurseAssignments = new Map<string, ScheduleAssignment[]>()
    assignments.forEach(assignment => {
      if (!nurseAssignments.has(assignment.nurseId)) {
        nurseAssignments.set(assignment.nurseId, [])
      }
      nurseAssignments.get(assignment.nurseId)!.push(assignment)
    })
    
    // Check constraints for each nurse
    for (const [nurseId, nurseAssignmentList] of nurseAssignments) {
      const nurse = this.context.nurses.find(n => n.id === nurseId)
      if (!nurse) continue
      
      // Check maximum shifts constraint
      if (nurseAssignmentList.length > nurse.maxShiftsPerBlock) {
        return false
      }
      
      // Check consecutive days constraint
      if (!this.validateConsecutiveDays(nurseAssignmentList)) {
        return false
      }
      
      // Check PTO/no-schedule conflicts
      const blockedDates = (nurse as any).blockedDates as Set<string>
      if (blockedDates && nurseAssignmentList.some(a => blockedDates.has(a.date))) {
        return false
      }
    }
    
    return true
  }
  
  /**
   * Validate consecutive days constraint for a nurse's assignments
   */
  private validateConsecutiveDays(assignments: ScheduleAssignment[]): boolean {
    if (assignments.length <= 1) return true
    
    const dates = assignments.map(a => parseISO(a.date)).sort((a, b) => a.getTime() - b.getTime())
    
    let consecutiveCount = 1
    for (let i = 1; i < dates.length; i++) {
      const daysDiff = differenceInDays(dates[i], dates[i - 1])
      
      if (daysDiff === 1) {
        consecutiveCount++
        if (consecutiveCount > this.context.rules.maxConsecutiveDays) {
          return false
        }
      } else {
        consecutiveCount = 1
      }
    }
    
    return true
  }
  
  /**
   * Calculate optimization score based on multiple factors
   */
  private calculateOptimizationScore(
    assignments: ScheduleAssignment[], 
    strategy: 'balanced' | 'coverage' | 'preferences' | 'fairness'
  ): number {
    const coverageScore = this.calculateCoverageScore(assignments)
    const preferenceScore = this.calculatePreferenceScore(assignments)
    const fairnessScore = this.calculateFairnessScore(assignments)
    const seniorityScore = this.calculateSeniorityScore(assignments)
    
    // Weight scores based on optimization strategy
    let weights = { coverage: 0.4, preference: 0.3, fairness: 0.2, seniority: 0.1 }
    
    switch (strategy) {
      case 'coverage':
        weights = { coverage: 0.7, preference: 0.1, fairness: 0.1, seniority: 0.1 }
        break
      case 'preferences':
        weights = { coverage: 0.2, preference: 0.6, fairness: 0.1, seniority: 0.1 }
        break
      case 'fairness':
        weights = { coverage: 0.2, preference: 0.2, fairness: 0.5, seniority: 0.1 }
        break
    }
    
    // Adjust seniority weight if seniority bias is disabled
    if (!this.context.rules.enableSeniorityBias) {
      const seniorityWeight = weights.seniority
      weights.seniority = 0
      // Redistribute seniority weight to other factors
      weights.coverage += seniorityWeight * 0.4
      weights.preference += seniorityWeight * 0.3
      weights.fairness += seniorityWeight * 0.3
    }
    
    return (
      coverageScore * weights.coverage +
      preferenceScore * weights.preference +
      fairnessScore * weights.fairness +
      seniorityScore * weights.seniority
    )
  }
  
  /**
   * Calculate how well coverage requirements are met
   */
  private calculateCoverageScore(assignments: ScheduleAssignment[]): number {
    let totalRequiredSlots = 0
    let totalFilledSlots = 0
    
    this.context.requirements.forEach(requirement => {
      totalRequiredSlots += requirement.requiredNurses
      const filled = assignments.filter(a => 
        a.date === requirement.date && a.shiftType === requirement.shiftType
      ).length
      totalFilledSlots += Math.min(filled, requirement.requiredNurses)
    })
    
    return totalRequiredSlots > 0 ? totalFilledSlots / totalRequiredSlots : 1
  }
  
  /**
   * Calculate how well nurse preferences are satisfied
   */
  private calculatePreferenceScore(assignments: ScheduleAssignment[]): number {
    let totalPreferences = 0
    let satisfiedPreferences = 0
    
    assignments.forEach(assignment => {
      const nurse = this.context.nurses.find(n => n.id === assignment.nurseId)
      if (!nurse?.preferences) return
      
      const preference = nurse.preferences.preferredShifts[assignment.date]
      if (preference) {
        totalPreferences++
        if (preference === assignment.shiftType || preference === 'ANY') {
          satisfiedPreferences++
        }
      }
    })
    
    return totalPreferences > 0 ? satisfiedPreferences / totalPreferences : 1
  }
  
  /**
   * Calculate fairness of workload distribution
   */
  private calculateFairnessScore(assignments: ScheduleAssignment[]): number {
    const workloads = new Map<string, number>()
    
    // Count assignments per nurse
    assignments.forEach(assignment => {
      workloads.set(assignment.nurseId, (workloads.get(assignment.nurseId) || 0) + 1)
    })
    
    if (workloads.size === 0) return 1
    
    const workloadValues = Array.from(workloads.values())
    const mean = workloadValues.reduce((sum, val) => sum + val, 0) / workloadValues.length
    const variance = workloadValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / workloadValues.length
    
    // Lower variance = higher fairness score
    return Math.max(0, 1 - (variance / (mean * mean)))
  }
  
  /**
   * Calculate seniority satisfaction score
   */
  private calculateSeniorityScore(assignments: ScheduleAssignment[]): number {
    if (!this.context.rules.enableSeniorityBias) {
      return 1 // Perfect score if seniority bias is disabled
    }
    
    let totalSeniorityValue = 0
    let maxPossibleSeniorityValue = 0
    
    assignments.forEach(assignment => {
      const nurse = this.context.nurses.find(n => n.id === assignment.nurseId)
      if (!nurse) return
      
      totalSeniorityValue += nurse.seniorityLevel
      
      // Find max seniority nurse who could work this shift
      const availableNurses = this.context.nurses.filter(n => 
        n.shiftTypes.includes(assignment.shiftType)
      )
      const maxSeniority = Math.max(...availableNurses.map(n => n.seniorityLevel))
      maxPossibleSeniorityValue += maxSeniority
    })
    
    return maxPossibleSeniorityValue > 0 ? totalSeniorityValue / maxPossibleSeniorityValue : 1
  }
  
  /**
   * Create final schedule object with complete scoring and statistics
   */
  private createScheduleFromAssignments(assignments: ScheduleAssignment[]): GeneratedSchedule {
    const optimizationScore = this.calculateOptimizationScore(assignments, 'balanced')
    const coverageScore = this.calculateCoverageScore(assignments)
    const preferenceScore = this.calculatePreferenceScore(assignments)
    const fairnessScore = this.calculateFairnessScore(assignments)
    const seniorityScore = this.calculateSeniorityScore(assignments)
    
    // Calculate statistics
    const nurseWorkloads: Record<string, number> = {}
    const preferenceSatisfaction: Record<string, number> = {}
    
    assignments.forEach(assignment => {
      nurseWorkloads[assignment.nurseId] = (nurseWorkloads[assignment.nurseId] || 0) + 1
      
      const nurse = this.context.nurses.find(n => n.id === assignment.nurseId)
      if (nurse?.preferences) {
        const preference = nurse.preferences.preferredShifts[assignment.date]
        const satisfied = preference === assignment.shiftType || preference === 'ANY'
        preferenceSatisfaction[assignment.nurseId] = 
          (preferenceSatisfaction[assignment.nurseId] || 0) + (satisfied ? 1 : 0)
      }
    })
    
    // Convert satisfaction counts to percentages
    Object.keys(preferenceSatisfaction).forEach(nurseId => {
      const totalAssignments = nurseWorkloads[nurseId] || 1
      preferenceSatisfaction[nurseId] = preferenceSatisfaction[nurseId] / totalAssignments
    })
    
    const violations = this.findViolations(assignments)
    
    return {
      id: `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assignments,
      optimizationScore,
      coverageScore,
      preferenceScore,
      fairnessScore,
      seniorityScore,
      violations,
      statistics: {
        totalAssignments: assignments.length,
        nurseWorkloads,
        coverageMetrics: {
          totalRequired: this.context.requirements.reduce((sum, req) => sum + req.requiredNurses, 0),
          totalFilled: assignments.length,
          coveragePercentage: coverageScore
        },
        preferenceSatisfaction
      }
    }
  }
  
  /**
   * Find any remaining violations in the schedule
   */
  private findViolations(assignments: ScheduleAssignment[]): string[] {
    const violations: string[] = []
    
    // Check coverage violations
    this.context.requirements.forEach(requirement => {
      const assigned = assignments.filter(a => 
        a.date === requirement.date && a.shiftType === requirement.shiftType
      ).length
      
      if (assigned < requirement.requiredNurses) {
        violations.push(
          `Understaffed ${requirement.shiftType} shift on ${requirement.date}: ` +
          `${assigned}/${requirement.requiredNurses} nurses assigned`
        )
      }
    })
    
    // Check nurse constraint violations
    const nurseAssignments = new Map<string, ScheduleAssignment[]>()
    assignments.forEach(assignment => {
      if (!nurseAssignments.has(assignment.nurseId)) {
        nurseAssignments.set(assignment.nurseId, [])
      }
      nurseAssignments.get(assignment.nurseId)!.push(assignment)
    })
    
    nurseAssignments.forEach((nurseAssignmentList, nurseId) => {
      const nurse = this.context.nurses.find(n => n.id === nurseId)
      if (!nurse) return
      
      // Check maximum shifts
      if (nurseAssignmentList.length > nurse.maxShiftsPerBlock) {
        violations.push(
          `Nurse ${nurse.name} assigned ${nurseAssignmentList.length} shifts ` +
          `(max: ${nurse.maxShiftsPerBlock})`
        )
      }
      
      // Check minimum shifts (from rules)
      if (nurseAssignmentList.length < this.context.rules.minShiftsPerNurse) {
        violations.push(
          `Nurse ${nurse.name} assigned only ${nurseAssignmentList.length} shifts ` +
          `(min: ${this.context.rules.minShiftsPerNurse})`
        )
      }
    })
    
    return violations
  }
}