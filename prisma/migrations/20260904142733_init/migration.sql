-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('APPOINTMENT', 'WALK_IN');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('REGISTERED', 'WAITING_APPROVAL', 'APPROVED', 'REJECTED', 'CHECKED_IN', 'IN_MEETING', 'CHECKED_OUT');

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "type" "VisitType" NOT NULL,
    "status" "VisitStatus" NOT NULL DEFAULT 'REGISTERED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvalAskedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "meetingStartedAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitStatusHistory" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "status" "VisitStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "VisitStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Visit_departmentId_status_priority_approvalAskedAt_idx" ON "Visit"("departmentId", "status", "priority", "approvalAskedAt");

-- CreateIndex
CREATE INDEX "Visit_status_registeredAt_idx" ON "Visit"("status", "registeredAt");

-- CreateIndex
CREATE INDEX "VisitStatusHistory_visitId_createdAt_idx" ON "VisitStatusHistory"("visitId", "createdAt");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitStatusHistory" ADD CONSTRAINT "VisitStatusHistory_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
