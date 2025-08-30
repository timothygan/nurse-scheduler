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
*To be populated based on research and development*
- Main entry point: TBD
- Configuration: TBD
- Database: TBD
- Frontend: TBD
- Backend: TBD

## Development Guidelines
- Always follow the R.P.E.R. cycle for tasks
- **Research Phase**: Consult MEMORY_BANK.md first, then FILE_GLOSSARY.md before opening files
- **Plan Phase**: Document assumptions and present plan for approval
- **Execute Phase**: Implement changes according to documented plan
- **Review Phase**: Conduct thorough code review including security, functionality, and style checks
- Update MEMORY_BANK.md and FILE_GLOSSARY.md after task completion
- Use existing patterns and conventions discovered in previous tasks
- Check package.json for available scripts
- Run linting/typechecking before committing
- Optimize context usage by leveraging dedicated documentation files