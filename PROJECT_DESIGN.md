# Nurse Scheduler - Project Design Document

## Design Evolution History
*This document tracks the evolution of design decisions, requirements analysis, and architectural choices as the project develops.*

---

## Initial Requirements Analysis (2025-08-30)

### Problem Statement  
Create a web application to help nurse schedulers create nurse schedules for **customizable scheduling periods** with complex constraints and preferences.

### Core Complexity Factors
1. **Scheduling Constraints**: **Customizable duration blocks** with variable shift requirements per nurse
2. **Multiple User Types**: Schedulers (define rules) vs Nurses (submit preferences)
3. **Flexible Rules**: Different hospitals have different policies (configurable)
4. **Nurse Attributes**: Seniority, qualifications, shift types (day/night/hybrid)
5. **Preference Management**: PTO, no-schedule days, preferred shifts
6. **Optimization**: Multiple valid schedules with bias toward seniority
7. **Conflict Resolution**: Senior nurses get preferences, junior nurses may work no-schedule days

### ⚠️ CRITICAL CORRECTION (2025-08-30)
**Original Assumption**: All hospitals use 4-week scheduling blocks
**Corrected Requirement**: Scheduling period duration must be **customizable per hospital**
- Some hospitals use 1-week, 2-week, 4-week, monthly, or other custom periods
- Database schema already supports this with flexible startDate/endDate fields
- UI must accommodate any scheduling period length
- Rules must adapt to different period durations

### Key Requirements Identified

#### Scheduler Features
- Define scheduling blocks (**customizable duration periods**)
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
- Generate multiple valid schedule combinations for **any scheduling period duration**
- Constraint satisfaction with complex rule validation that adapts to period length
- Real-time collaboration between schedulers and nurses
- Multi-hospital/organization support with per-hospital scheduling preferences

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

## Implementation Status Updates

### Phase 4 Enhancement: Schedule Approval System (2025-08-30)

**Feature Implemented**: Comprehensive schedule approval workflow enabling schedulers to review, approve, and activate generated schedules.

**Key Components Added**:
1. **Approval API Endpoints** (`/api/schedules/[id]/approval/route.ts`)
   - POST: Approve (DRAFT→APPROVED) and Activate (APPROVED→ACTIVE) schedules  
   - DELETE: Revert schedules back to DRAFT status
   - Enforces single active schedule per scheduling block constraint

2. **Scheduler UI Enhancements** (`/dashboard/scheduler/blocks/[id]/page.tsx`)
   - Status badges with color coding (DRAFT/APPROVED/ACTIVE)
   - Conditional approval buttons based on schedule status
   - Visual workflow: Approve → Activate → Deactivate/Revert

3. **Nurse Schedule Viewing** (`/dashboard/nurse/schedules/page.tsx`)
   - Dedicated page for nurses to view approved/active schedules
   - Calendar layout with shift assignments visualization  
   - Schedule satisfaction metrics and statistics
   - Export functionality (UI ready)

4. **Nurse API Integration** (`/api/nurse/schedules/route.ts`)
   - Fetches only approved/active schedules for logged-in nurse
   - Groups assignments by scheduling block
   - Calculates satisfaction averages and shift counts

**Status Workflow Implemented**:
- **DRAFT**: Initial generated schedules (default)
- **APPROVED**: Scheduler-reviewed and approved for activation
- **ACTIVE**: Currently active schedule (only one per block)
- **Revert**: Any status can be reverted to DRAFT

**Business Rules Enforced**:
- Only schedulers can approve/activate schedules
- Only one ACTIVE schedule allowed per scheduling block  
- Nurses can only view APPROVED and ACTIVE schedules
- Complete audit trail with approvedById and approvedAt timestamps

**Testing Completed**:
- End-to-end approval workflow testing
- API endpoint validation
- Database constraint verification
- UI conditional logic testing
- Nurse visibility permissions

---

### Phase 5 Enhancement: Schedule Export System (2025-08-31)

**Feature Implemented**: Comprehensive export functionality enabling both schedulers and nurses to export schedule data in multiple formats.

**Key Components Added**:
1. **Scheduler Export API** (`/api/schedules/[id]/export/route.ts`)
   - CSV and JSON format support for full schedule exports
   - Role-based access control (schedulers can export all schedules)
   - Multiple export scopes (full schedule, nurse-only filtering)
   - Comprehensive data structure with schedule metadata

2. **Nurse Export API** (`/api/nurse/schedules/export/route.ts`)
   - Personal schedule exports for authenticated nurses only
   - CSV and JSON format support with nurse profile information
   - Block-specific export filtering capability
   - Satisfaction metrics and summary statistics included

3. **Frontend Integration**
   - Connected existing export buttons to functional APIs
   - Proper file download handling with blob management
   - Toast notifications for success/error feedback
   - Filename generation with timestamps and schedule identification

**Export Data Structure**:
```typescript
exportData = {
  schedule: { id, version, status, optimizationScore, timestamps },
  schedulingBlock: { name, dates, hospital, createdBy },
  assignments: [{ date, dayOfWeek, shiftType, nurse, satisfaction }],
  exportInfo: { generatedAt, generatedBy, scope, format }
}
```

**Critical Bug Resolution**: 
- Fixed variable naming conflict between date-fns `format()` function and URL parameter `format`
- Renamed to `exportFormat` in both API endpoints to prevent server errors
- Issue caused 500 errors during CSV generation phase

**Business Rules Enforced**:
- Role-based export permissions (schedulers vs nurses)
- Authentication required for all export endpoints
- Proper CSV escaping and header generation
- File naming conventions with timestamps and identification

**Testing Completed**:
- Scheduler export functionality verified (200 responses)
- Authentication and access control tested (401 for unauthorized)
- Error handling validated (invalid IDs, unsupported formats)
- File download functionality confirmed in browser
- CSV content structure and formatting verified

**Files Created/Modified**:
- `src/app/api/schedules/[id]/export/route.ts` - Scheduler export API
- `src/app/api/nurse/schedules/export/route.ts` - Nurse personal export API
- Export functionality integrated in existing dashboard pages

**Status**: ✅ **COMPLETED** - Full export system functional and production-ready

---

### Critical Bug Fixes: Schedule Details Modal (2025-08-31)

**Issues Reported**: Schedule popup crashes when viewing nurse details, modal too narrow for content

**Bugs Fixed**:

1. **TypeError: ptoRequests.forEach is not a function**
   - **Location**: `src/components/scheduler/schedule-details-modal.tsx:218`
   - **Root Cause**: Database stores ptoRequests as JSON, but code expected array
   - **Solution**: Added type checking and safe JSON parsing with error handling
   - **Impact**: Prevented application crashes when viewing schedule details

2. **Modal Width Constraint Issue**
   - **Location**: `src/components/ui/dialog.tsx:63`
   - **Problem**: Default `sm:max-w-lg` overrode custom width settings
   - **Solution**: Conditionally apply default width only when no custom max-w provided
   - **Impact**: Modal now displays at proper width (max-w-7xl) for better content visibility

3. **Calendar Rendering**
   - **Status**: Fixed after width correction
   - **Features Working**: Date grid, nurse assignments, shift type color coding (yellow=day, blue=night)

4. **Tab Content Switching**
   - **Finding**: Preference Analysis tab requires individual nurse selection (by design)
   - **Recommendation**: Add empty state messaging for better UX

**Technical Details**:
- Used try-catch blocks for safe JSON parsing
- Implemented conditional className application in dialog component
- Maintained backward compatibility with existing dialog usages

**Testing Results**:
- ✅ No runtime errors when viewing schedules
- ✅ Modal displays at full width
- ✅ Calendar shows all nurse assignments
- ✅ Dropdown nurse selection works
- ⚠️ Tab content switching needs UX improvements

---

*This document will be updated as new requirements emerge and design decisions are made.*