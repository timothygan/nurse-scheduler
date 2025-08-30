# Claude Code Context - Nurse Scheduler

## AI Workflow & Principles

### Core Principles
- **Quality & Integrity**: All work must be thoroughly double-checked for accuracy, logical consistency, and completeness. Avoid hallucinations at all costs.
- **Documentation**: Every action, decision, and output must be documented clearly and concisely.
- **Efficiency**: Optimize for speed by leveraging existing information and avoiding redundant context processing.

### The R.P.E.R. Cycle (Research, Plan, Execute, Review)
Before beginning any task, explicitly follow these steps:

1. **Research**
   - Consult the Memory Bank for relevant past tasks
   - Check the File Glossary to understand existing files
   - Perform necessary external research
   - State what you have learned

2. **Plan**
   - Formulate a detailed, step-by-step plan based on research
   - Address user requirements and constraints
   - Document any assumptions made
   - Present plan for approval before execution

3. **Execute**
   - Carry out the plan exactly as documented
   - If issues arise, halt and update the plan
   - Provide final output with brief summary

4. **Review**
   - Conduct comprehensive code review of all changes
   - Verify functionality works as expected (run tests, build, etc.)
   - Check for security vulnerabilities and best practices
   - Ensure code follows project style and conventions
   - Validate performance implications
   - Document any issues found and remediate before completion

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
- **CRITICAL**: Update PROJECT_DESIGN.md immediately when requirements change or assumptions are corrected
- **CRITICAL**: Log ALL user prompts, decisions, and corrections in MEMORY_BANK.md
- Update FILE_GLOSSARY.md after creating/modifying files
- Document design decisions and their rationale in real-time
- Track requirement changes and their impact on architecture
- Maintain conversation history for context continuity
- Use existing patterns and conventions discovered in previous tasks
- Check package.json for available scripts
- Run linting/typechecking before committing
- Optimize context usage by leveraging dedicated documentation files