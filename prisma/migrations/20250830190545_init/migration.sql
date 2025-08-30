-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verificationtokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "hospitals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "nurse_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "hire_date" DATETIME NOT NULL,
    "seniority_level" INTEGER NOT NULL,
    "shift_types" TEXT NOT NULL,
    "qualifications" JSONB NOT NULL,
    "contract_hours_per_week" INTEGER NOT NULL,
    "max_shifts_per_block" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "nurse_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scheduling_blocks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hospital_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rules" JSONB NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "scheduling_blocks_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "scheduling_blocks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "nurse_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nurse_id" TEXT NOT NULL,
    "scheduling_block_id" TEXT NOT NULL,
    "preferredShifts" JSONB NOT NULL,
    "ptoRequests" JSONB NOT NULL,
    "noScheduleRequests" JSONB NOT NULL,
    "flexibility_score" INTEGER NOT NULL DEFAULT 5,
    "submitted_at" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "nurse_preferences_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "nurse_preferences_scheduling_block_id_fkey" FOREIGN KEY ("scheduling_block_id") REFERENCES "scheduling_blocks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduling_block_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "algorithm_used" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "optimization_score" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approved_by_id" TEXT,
    "approved_at" DATETIME,
    "generated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "schedules_scheduling_block_id_fkey" FOREIGN KEY ("scheduling_block_id") REFERENCES "scheduling_blocks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shift_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schedule_id" TEXT NOT NULL,
    "nurse_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "shift_type" TEXT NOT NULL,
    "required_qualifications_met" BOOLEAN NOT NULL DEFAULT true,
    "preference_satisfaction_score" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shift_assignments_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shift_assignments_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_token_key" ON "verificationtokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_identifier_token_key" ON "verificationtokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "nurse_profiles_user_id_key" ON "nurse_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "nurse_profiles_employee_id_key" ON "nurse_profiles"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "nurse_preferences_nurse_id_scheduling_block_id_key" ON "nurse_preferences"("nurse_id", "scheduling_block_id");

-- CreateIndex
CREATE UNIQUE INDEX "shift_assignments_schedule_id_nurse_id_date_shift_type_key" ON "shift_assignments"("schedule_id", "nurse_id", "date", "shift_type");
