# Claude Code Context - Nurse Scheduler

## AI Workflow & Principles

### Core Principles
- **Quality & Integrity**: All work must be thoroughly double-checked for accuracy, logical consistency, and completeness. Avoid hallucinations at all costs.
- **Documentation**: Every action, decision, and output must be documented clearly and concisely.
- **Efficiency**: Optimize for speed by leveraging existing information and avoiding redundant context processing.

### Available AI Agents

The following specialized agents are available to handle complex tasks through the Task tool:

1. **prompt-optimizer**: Refines, clarifies, and enhances prompts before execution
   - Use for: Vague or ambiguous user requests that need clarification
   - Ensures prompts are clear, complete, and actionable

2. **task-orchestrator**: Coordinates multiple agents to complete complex tasks using R.P.E.R. cycle
   - Use for: Multi-phase implementations, comprehensive features, complex debugging
   - Manages the entire workflow from research through review
   - Delegates work to appropriate specialized agents

3. **research-optimizer**: Conducts thorough research and prepares optimized context
   - Use for: New feature implementations, debugging tasks, understanding existing code
   - Gathers all necessary information before planning begins

4. **task-planner**: Breaks down complex tasks into manageable, sequential steps  
   - Use for: Feature implementations, refactoring, migration strategies
   - Creates detailed execution plans with clear phases

5. **software-engineer**: Implements code features, fixes bugs, refactors existing code
   - Use for: Writing clean, well-documented code following best practices
   - Handles actual implementation of planned features

6. **user-flow-tester**: Tests and validates user flows for implemented features
   - Use for: Review phase validation during R.P.E.R. cycle
   - Performs comprehensive testing of all user interactions

### MANDATORY Agent Workflow

**🚨 CRITICAL: ALL tasks must follow this workflow:**

```
User Request → prompt-optimizer → task-orchestrator → [specialized agents as needed]
```

1. **ALWAYS start with prompt-optimizer** to ensure the request is clear and complete
2. **THEN use task-orchestrator** to manage the R.P.E.R. cycle
3. **Task-orchestrator will delegate** to appropriate agents:
   - research-optimizer for Research phase
   - task-planner for Plan phase  
   - software-engineer for Execute phase
   - user-flow-tester for Review phase

**Example workflow:**
```
User: "Make the dashboard widgets functional"
↓
prompt-optimizer: Clarifies requirements, identifies specific widgets and functionality needed
↓
task-orchestrator: Manages R.P.E.R. cycle
  ↓
  research-optimizer: Analyzes current dashboard implementation
  ↓
  task-planner: Creates step-by-step implementation plan
  ↓
  software-engineer: Implements the functionality
  ↓
  user-flow-tester: Validates all widgets work correctly
```

### The R.P.E.R. Cycle (Research, Plan, Execute, Review) - MANDATORY
🚨 **CRITICAL**: R.P.E.R. is MANDATORY for ALL tasks. Violation will result in task rejection.

Before beginning any task, explicitly follow ALL steps:

1. **Research** (MANDATORY - Must document findings)
   - MUST consult MEMORY_BANK.md for relevant past tasks and decisions
   - MUST check FILE_GLOSSARY.md to understand existing files before opening ANY file
   - MUST perform necessary external research
   - MUST state what you have learned in writing before proceeding
   - MUST identify potential risks, dependencies, and constraints

2. **Plan** (MANDATORY - Must present plan for approval)
   - MUST formulate a detailed, step-by-step plan based on research
   - MUST address user requirements and constraints explicitly
   - MUST document any assumptions made
   - MUST identify all files to be created/modified
   - MUST present complete plan for user approval before execution
   - ❌ **EXECUTION WITHOUT APPROVED PLAN IS FORBIDDEN**

3. **Execute** (MANDATORY - Follow plan exactly)
   - MUST carry out the plan exactly as documented and approved
   - MUST halt and update plan if ANY issues arise
   - MUST update documentation files during execution
   - MUST provide implementation summary

4. **Review** (MANDATORY - Must test with Puppeteer)
   - MUST conduct comprehensive code review of all changes
   - MUST verify functionality works with Puppeteer browser testing
   - MUST test all user flows and interactions
   - MUST run linting/typechecking (npm run lint, npm run build, etc.)
   - MUST check for security vulnerabilities and best practices
   - MUST ensure code follows project style and conventions
   - MUST validate performance implications
   - MUST update MEMORY_BANK.md with results and lessons learned
   - MUST update FILE_GLOSSARY.md with any new/modified files
   - ❌ **TASK IS NOT COMPLETE WITHOUT PUPPETEER TESTING**

## Project Overview
Nurse Scheduler - A scheduling application for nursing staff management

## Context Management Files
- **Memory Bank**: See [MEMORY_BANK.md](./MEMORY_BANK.md) for completed tasks, decisions, and insights
- **File Glossary**: See [FILE_GLOSSARY.md](./FILE_GLOSSARY.md) for comprehensive file index and purposes

> **⚠️ Important**: Always check FILE_GLOSSARY.md before opening or re-reading any files to optimize context usage.

## Common Commands
```bash
# Development
npm run dev          # Start development server with Turbopack
npm start           # Start production server

# Build & Linting
npm run build       # Build production application
npm run lint        # Run ESLint

# Database (to be added)
npm run db:migrate  # Run database migrations  
npm run db:seed     # Seed database with test data
npm run db:studio   # Open Prisma Studio
```

## Architecture Notes
- **Framework**: Next.js 15 with App Router and Turbopack
- **Authentication**: NextAuth.js with role-based access control
- **Database**: SQLite with Prisma ORM, deployed schema with 8 core models
- **UI Library**: shadcn/ui with Radix UI primitives and Tailwind CSS
- **State Management**: React Hook Form with Zod validation
- **Key Feature**: Customizable scheduling periods (not fixed 4-week blocks)

## Phase Completion Tracking
When phases or major features are completed, document them here with commit info:

### ✅ Phase 2 Complete - Scheduler Interface (Commit: cd7d3f2)
**Date**: August 30, 2025  
**Git Summary**: `feat: Complete Phase 2 - Scheduler Interface with Authentication`  
**Key Achievements**:
- NextAuth.js authentication with test accounts
- Customizable scheduling periods (1 week, 2 weeks, 4 weeks, 1 month, custom)
- Complete database schema with migrations and seeding
- Scheduler dashboard with statistics and navigation
- Professional UI with shadcn/ui components
- Fixed critical requirement: Removed 4-week scheduling assumption

**Test Accounts Created**:
- Scheduler: `scheduler@hospital.com` / `password123`
- Nurses: `nurse1@hospital.com`, `nurse2@hospital.com`, `nurse3@hospital.com` / `nurse123`

**Next**: Phase 3 - Nurse preferences interface implementation

## Development Guidelines
- Always follow the R.P.E.R. cycle for tasks
- **Research Phase**: Consult MEMORY_BANK.md first, then FILE_GLOSSARY.md before opening files
- **Plan Phase**: Document assumptions and present plan for approval
- **Execute Phase**: Implement changes according to documented plan
- **Review Phase**: Conduct thorough code review including security, functionality, and style checks

## Documentation Requirements
- **MANDATORY**: Update MEMORY_BANK.md BETWEEN EVERY PROMPT with user messages, actions taken, and decisions made
- **MANDATORY**: Reference MEMORY_BANK.md at start of each response to understand context and avoid redundant work
- **CRITICAL**: Update PROJECT_DESIGN.md immediately when requirements change or assumptions are corrected
- **CRITICAL**: Log ALL user prompts, decisions, and corrections in MEMORY_BANK.md
- **CRITICAL**: Update this file (CLAUDE.md) with phase completion details including git commit messages
- **CRITICAL**: Maintain comprehensive project history tracking all phases, user prompts, and decisions
- Update FILE_GLOSSARY.md after creating/modifying files
- Document design decisions and their rationale in real-time
- Track requirement changes and their impact on architecture
- Maintain conversation history for context continuity
- Use existing patterns and conventions discovered in previous tasks
- Check package.json for available scripts
- Run linting/typechecking before committing
- Optimize context usage by leveraging dedicated documentation files

### Change Log Protocol
**EVERY RESPONSE MUST:**
1. **START**: Read MEMORY_BANK.md for recent context
2. **LOG PROMPT**: Document the user's exact request/prompt in MEMORY_BANK.md immediately
3. **TRACK ACTIONS**: Log each action taken during the response as it happens
4. **UPDATE STATUS**: Document project status changes and decisions made
5. **RESOLVE ISSUES**: Note any problems encountered and their solutions
6. **END**: Complete MEMORY_BANK.md entry before finishing response

### R.P.E.R. Cycle - MANDATORY REVIEW REQUIREMENT
**THE REVIEW PHASE IS ABSOLUTELY MANDATORY:**
- Every Execute phase MUST be followed by a Review phase
- Review phase MUST include end-to-end functionality testing
- Review phase MUST use Puppeteer for actual browser testing of user flows
- Review phase MUST test ALL user paths and interactions for the implemented feature
- Review phase MUST identify and document any bugs or issues
- NO TASK IS COMPLETE until Review phase validates functionality
- If bugs are found during Review, return to Execute phase to fix them

**PUPPETEER TESTING REQUIREMENT:**
- Navigate to the application using mcp__puppeteer__puppeteer_navigate
- Take screenshots at key steps using mcp__puppeteer__puppeteer_screenshot  
- Click buttons and interact with forms using mcp__puppeteer__puppeteer_click and mcp__puppeteer__puppeteer_fill
- Verify that each user flow works completely without errors
- Document any console errors or visual issues discovered

### Documentation Enforcement Checklist
**BEFORE SENDING ANY RESPONSE:**
- [ ] MEMORY_BANK.md updated with current user prompt
- [ ] All actions and decisions logged in real-time
- [ ] FILE_GLOSSARY.md updated if files created/modified
- [ ] PROJECT_DESIGN.md updated if requirements changed
- [ ] CLAUDE.md updated if phases completed

### Documentation Failure Recovery
**IF DOCUMENTATION WAS MISSED:**
1. **STOP** current work immediately
2. **BACKFILL** all missing documentation entries
3. **TIMESTAMP** all retroactive updates as "[RETROACTIVE - {date}]"
4. **CONTINUE** with proper documentation workflow