# File Glossary - Nurse Scheduler

## Purpose
This file maintains an up-to-date, high-level index of the project's file structure and each file's purpose. **Always check this glossary before opening or re-reading files.**

## Root Level Files

### Configuration & Setup
- **`.gitignore`** - Next.js ignore patterns for dependencies, builds, environment files, and IDE artifacts ✅
- **`README.md`** - Next.js default documentation with getting started instructions ✅
- **`package.json`** - Next.js dependencies (React 19, Next.js 15.5.2, TypeScript, Tailwind CSS, ESLint) ✅
- **`next.config.ts`** - Next.js configuration file ✅
- **`next-env.d.ts`** - Next.js TypeScript environment declarations ✅
- **`tsconfig.json`** - TypeScript configuration with Next.js defaults ✅
- **`eslint.config.mjs`** - ESLint configuration for Next.js ✅
- **`postcss.config.mjs`** - PostCSS configuration for Tailwind CSS ✅

### Documentation & Context
- **`CLAUDE.md`** - AI workflow principles, R.P.E.R. cycle methodology, and project context ✅
- **`MEMORY_BANK.md`** - Record of completed tasks, decisions, insights, and patterns discovered ✅
- **`FILE_GLOSSARY.md`** - This file - index of all project files and their purposes ✅
- **`PROJECT_DESIGN.md`** - Comprehensive design document tracking requirements evolution and architectural decisions ✅

## Planned Project Structure

### Next.js Application Structure
- **`/src`** ✅ - Main application source code directory
  - **`/app`** ✅ - Next.js 15 app directory structure with default layout and page
    - **`/dashboard`** 📝 - Protected routes for schedulers and nurses (planned)
    - **`/api`** 📝 - API routes for backend functionality (planned)
  - **`/components`** 📝 - Reusable React components (planned)
    - **`/ui`** 📝 - Basic UI components (buttons, forms, etc.)
    - **`/scheduling`** 📝 - Scheduling-specific components
  - **`/lib`** ✅ - Utility functions and shared logic
    - **`db.ts`** ✅ - Prisma client singleton with proper connection handling
    - **`/scheduling`** 📝 - Scheduling algorithm implementations (planned)
  - **`/types`** ✅ - TypeScript type definitions
    - **`index.ts`** ✅ - Core types including Prisma re-exports and custom business logic types
  - **`/generated/prisma`** ✅ - Generated Prisma client and types (auto-generated, ignored by ESLint)
  - **`/hooks`** 📝 - Custom React hooks (planned)
- **`/public`** ✅ - Static assets (Next.js favicon and Vercel icons)

### Database & Configuration
- **`/prisma`** ✅ - Database schema, migrations, and seeding
  - **`schema.prisma`** ✅ - Complete database schema with all models, enums, and relationships defined
  - **`/migrations`** 📝 - Database migration files (to be generated on first migration)
- **`/config`** 📝 - Environment and app configuration (planned)
- **`.env`** 📝 - Environment variables (not tracked, user to create from example)
- **`.env.example`** ✅ - Example environment variables with DATABASE_URL, NextAuth settings

### Testing & Development
- **`/tests`** 📝 - Test files and utilities
  - **`/unit`** 📝 - Unit tests
  - **`/integration`** 📝 - Integration tests
  - **`/e2e`** 📝 - End-to-end tests
- **`/docs`** 📝 - Additional project documentation

## File Status Legend
- ✅ **Exists** - File has been created and populated
- 📝 **Planned** - File is planned but not yet created
- 🔄 **In Progress** - File is being actively worked on
- ❓ **Unknown** - File exists but purpose not yet documented

## Recently Modified Files (2025-08-31)

### Critical Bug Fixes - Schedule Details Modal
- **`src/components/scheduler/schedule-details-modal.tsx`** 🔧 - Fixed ptoRequests.forEach TypeError with safe JSON parsing
- **`src/components/ui/dialog.tsx`** 🔧 - Fixed modal width constraint for proper max-w-7xl display

### Export System Implementation  
- **`src/app/api/schedules/[id]/export/route.ts`** ✅ - Scheduler export API (CSV/JSON) - Fixed format variable conflict
- **`src/app/api/nurse/schedules/export/route.ts`** ✅ - Nurse personal export API - Fixed format variable conflict
- **`src/app/dashboard/scheduler/blocks/[id]/page.tsx`** 🔧 - Connected export buttons to functional APIs
- **`src/app/dashboard/nurse/schedules/page.tsx`** ✅ - Nurse schedule viewing with calendar and export

### Schedule Approval System
- **`src/app/api/schedules/[id]/approval/route.ts`** ✅ - Complete approval workflow (approve/activate/revert)
- Status progression: DRAFT → APPROVED → ACTIVE with single active constraint

## Last Updated
2025-08-31 - Added export system, approval workflow, and critical bug fixes
2025-08-30 - Initial glossary creation with repository setup files

---

## Usage Notes
- **Before opening any file**: Check this glossary first to understand its purpose and current state
- **When creating new files**: Update this glossary immediately with the file's purpose
- **When modifying file purposes**: Update the description here to maintain accuracy
- **File discovery**: When you discover existing files, document them here to avoid future redundant exploration