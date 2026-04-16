-- Enums
CREATE TYPE "ScheduleType" AS ENUM ('MORNING','AFTERNOON','ROTATING','SPLIT','CUSTOM');
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY');
CREATE TYPE "LeaveType" AS ENUM ('VACATION','PERSONAL_DAY','SICK_LEAVE','MATERNITY','OTHER');
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING','APPROVED','REJECTED','CANCELLED');

-- work_schedules
CREATE TABLE "work_schedules" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "ScheduleType" NOT NULL,
  "description" TEXT,
  "weeklyHours" DOUBLE PRECISION NOT NULL,
  "annualHours" DOUBLE PRECISION,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  FOREIGN KEY ("companyId") REFERENCES "companies"("id")
);
CREATE INDEX "work_schedules_companyId_idx" ON "work_schedules"("companyId");

-- work_schedule_days
CREATE TABLE "work_schedule_days" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scheduleId" TEXT NOT NULL,
  "dayOfWeek" "DayOfWeek" NOT NULL,
  "isWorkDay" BOOLEAN NOT NULL DEFAULT true,
  "startTime" TEXT,
  "endTime" TEXT,
  "breakMinutes" INTEGER NOT NULL DEFAULT 0,
  "startTime2" TEXT,
  "endTime2" TEXT,
  FOREIGN KEY ("scheduleId") REFERENCES "work_schedules"("id"),
  UNIQUE("scheduleId", "dayOfWeek")
);

-- employee_schedules
CREATE TABLE "employee_schedules" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT,
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id"),
  FOREIGN KEY ("scheduleId") REFERENCES "work_schedules"("id")
);
CREATE INDEX "employee_schedules_employeeId_idx" ON "employee_schedules"("employeeId");
CREATE INDEX "employee_schedules_scheduleId_idx" ON "employee_schedules"("scheduleId");

-- leave_requests
CREATE TABLE "leave_requests" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "type" "LeaveType" NOT NULL,
  "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "days" DOUBLE PRECISION NOT NULL,
  "reason" TEXT,
  "hrNotes" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
);
CREATE INDEX "leave_requests_companyId_idx" ON "leave_requests"("companyId");
CREATE INDEX "leave_requests_employeeId_idx" ON "leave_requests"("employeeId");
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- leave_balances
CREATE TABLE "leave_balances" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "vacationDays" DOUBLE PRECISION NOT NULL DEFAULT 22,
  "vacationUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "personalDays" DOUBLE PRECISION NOT NULL DEFAULT 6,
  "personalUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id"),
  UNIQUE("employeeId", "year")
);
CREATE INDEX "leave_balances_companyId_idx" ON "leave_balances"("companyId");
