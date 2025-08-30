# Nurse Scheduler - Project Design Document

## Design Evolution History
*This document tracks the evolution of design decisions, requirements analysis, and architectural choices as the project develops.*

---

## Initial Requirements Analysis (2025-08-30)

### Problem Statement
Create a web application to help nurse schedulers create nurse schedules for 4-week blocks with complex constraints and preferences.

### Core Complexity Factors
1. **Scheduling Constraints**: 4-week blocks with variable shift requirements per nurse
2. **Multiple User Types**: Schedulers (define rules) vs Nurses (submit preferences)
3. **Flexible Rules**: Different hospitals have different policies (configurable)
4. **Nurse Attributes**: Seniority, qualifications, shift types (day/night/hybrid)
5. **Preference Management**: PTO, no-schedule days, preferred shifts
6. **Optimization**: Multiple valid schedules with bias toward seniority
7. **Conflict Resolution**: Senior nurses get preferences, junior nurses may work no-schedule days

### Key Requirements Identified

#### Scheduler Features
- Define scheduling blocks (4-week periods)
- Configure hospital-specific rules:
  - Number of shifts required per nurse
  - Weekend requirements
  - Maximum days per week
  - Qualification matching requirements
- Review and approve generated schedules
- Bias configuration (seniority weighting)

#### Nurse Features
- Submit preferences for scheduling blocks
- Request PTO and no-schedule days
- View assigned schedules
- Profile management (qualifications, seniority, shift type preferences)

#### System Features
- Generate multiple valid schedule combinations
- Constraint satisfaction with complex rule validation
- Real-time collaboration between schedulers and nurses
- Multi-hospital/organization support

---

## Architectural Decisions

### Technology Stack Rationale

**Frontend: Next.js/React with TypeScript**
- Complex UI requirements for rule configuration and schedule visualization
- TypeScript for type safety in complex domain models
- Server-side rendering for SEO and performance
- Built-in API routes for rapid development

**Backend: Node.js/Express with TypeScript**
- Unified language across stack
- Excellent ecosystem for web APIs
- Good performance for I/O-heavy operations
- Easy integration with Next.js

**Database: PostgreSQL + Redis**
- PostgreSQL: Complex relational data with ACID compliance
- Redis: Session management and caching for schedule generation

**Scheduling Engine: Custom Constraint Satisfaction**
- No existing library fits the specific nurse scheduling domain
- Need custom optimization algorithms for bias and preference weighting
- Future consideration: Integration with OR-Tools for advanced optimization

### Data Model Design Principles

1. **Flexibility First**: Rules should be configurable, not hardcoded
2. **Audit Trail**: Track all changes to schedules and preferences
3. **Version Control**: Multiple schedule versions with approval workflow
4. **Multi-tenancy**: Support multiple hospitals with isolated data
5. **Extensibility**: Easy to add new rule types and nurse attributes

---

## Core Data Models

### User Management
```
User (base)
├── id, email, password_hash, role
├── hospital_id (for multi-tenancy)
├── created_at, updated_at

Nurse (extends User)
├── employee_id, hire_date
├── seniority_level (integer or enum)
├── shift_types (day/night/hybrid)
├── qualifications (JSON or separate table)
├── contract_hours_per_week
├── max_shifts_per_block
```

### Scheduling Core
```
SchedulingBlock
├── id, hospital_id, name
├── start_date, end_date (28 days)
├── status (draft/open/locked/completed)
├── created_by (scheduler_id)
├── rules (JSON or FK to SchedulingRules)

SchedulingRules
├── id, scheduling_block_id
├── min_shifts_per_nurse, max_shifts_per_nurse
├── weekend_requirements
├── max_consecutive_days
├── required_qualifications_per_shift
├── no_schedule_days_policy
├── pto_approval_rules
```

### Preferences & Assignments
```
NursePreferences
├── id, nurse_id, scheduling_block_id
├── preferred_shifts (JSON: date -> shift_type)
├── pto_requests (date array)
├── no_schedule_requests (date array)
├── flexibility_score (how flexible they are)
├── submitted_at

GeneratedSchedule
├── id, scheduling_block_id, version
├── algorithm_used, parameters
├── optimization_score
├── status (draft/approved/active)
├── generated_at, approved_by

ShiftAssignment
├── id, schedule_id, nurse_id
├── date, shift_type
├── required_qualifications_met
├── preference_satisfaction_score
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goals**: Basic project structure, authentication, core models

**Deliverables**:
- Next.js project with TypeScript setup
- PostgreSQL database with initial schema
- User authentication (NextAuth.js)
- Basic hospital/organization models
- Simple nurse and scheduler dashboards

### Phase 2: Rule Configuration (Weeks 3-4)
**Goals**: Scheduler interface for defining scheduling blocks and rules

**Deliverables**:
- Scheduling block creation forms
- Configurable rule engine UI
- Nurse profile management
- Basic validation for rule consistency

### Phase 3: Nurse Preferences (Weeks 5-6)
**Goals**: Nurse interface for submitting preferences and requests

**Deliverables**:
- Preference submission forms with calendar UI
- PTO request workflow
- No-schedule day requests
- Preference validation against block rules

### Phase 4: Scheduling Engine (Weeks 7-9)
**Goals**: Core algorithm for generating valid schedules

**Deliverables**:
- Constraint satisfaction algorithm
- Multiple schedule generation with scoring
- Seniority bias implementation
- Schedule validation and conflict detection

### Phase 5: Advanced Features (Weeks 10-12)
**Goals**: Production-ready features and optimizations

**Deliverables**:
- Real-time updates and notifications
- Schedule approval workflow
- Analytics and reporting dashboards
- Performance optimization and testing

---

## Open Questions & Future Considerations

### Identified Unknowns
1. **Shift Types**: How many shift types exist? Are there overlapping shifts?
2. **Qualification Complexity**: How granular are device/training requirements?
3. **Fairness Metrics**: How is "fairness" measured across scheduling periods?
4. **Integration**: Need to integrate with existing HR/payroll systems?
5. **Mobile Usage**: What percentage of nurses will access via mobile?

### Technical Decisions Deferred
1. **Algorithm Choice**: Start with custom CSP, evaluate OR-Tools later
2. **Real-time**: WebSockets vs Server-Sent Events vs polling
3. **Caching Strategy**: Redis usage patterns for schedule generation
4. **Deployment**: Cloud provider and containerization strategy

### Future Enhancement Ideas
1. **AI/ML Integration**: Learn from historical schedules to improve optimization
2. **Mobile App**: Native mobile application for nurses
3. **Advanced Analytics**: Predictive staffing, burnout detection
4. **Integration APIs**: Connect with hospital management systems

---

## Design Principles

1. **User-Centric**: Both schedulers and nurses should find the system intuitive
2. **Transparent**: Algorithm decisions should be explainable
3. **Flexible**: Rules should be configurable for different hospital needs
4. **Scalable**: Support hospitals with 10-1000+ nurses
5. **Reliable**: Schedule generation should be consistent and predictable
6. **Fair**: Balance individual preferences with operational requirements

---

*This document will be updated as new requirements emerge and design decisions are made.*