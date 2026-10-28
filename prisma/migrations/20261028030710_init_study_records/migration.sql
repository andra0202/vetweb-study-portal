-- CreateEnum
CREATE TYPE "SessionState" AS ENUM ('CONSENTED', 'TASK_IN_PROGRESS', 'VERIFIED', 'INCOMPLETE', 'REVIEW_PENDING', 'SURVEY_SUBMITTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "VerificationOutcome" AS ENUM ('VERIFIED', 'INCOMPLETE', 'TECHNICAL_ERROR', 'MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'SENT', 'FAILED', 'INVALID_NUMBER', 'DECLINED', 'RAFFLE_ELIGIBLE', 'SELECTED_WINNER');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('RESEARCHER', 'PAYMENT_ADMIN', 'STUDY_ADMIN', 'SYSTEM_ADMIN');

-- CreateTable
CREATE TABLE "Study" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "state" "SessionState" NOT NULL DEFAULT 'CONSENTED',
    "taskVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VetWebParticipantLink" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantHash" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VetWebParticipantLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jtiHash" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "evidenceDigest" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDecision" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "outcome" "VerificationOutcome" NOT NULL,
    "reasons" JSONB NOT NULL,
    "criteria" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewerId" TEXT,

    CONSTRAINT "VerificationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireResponse" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "definitionVersion" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionnaireResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentClaim" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "encryptedNumber" TEXT NOT NULL,
    "duplicateHash" TEXT NOT NULL,
    "state" "PaymentState" NOT NULL DEFAULT 'PENDING_REVIEW',
    "referenceCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAccount" (
    "id" TEXT NOT NULL,
    "entraSubject" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "StaffAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "studyId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudySession_studyId_idx" ON "StudySession"("studyId");

-- CreateIndex
CREATE INDEX "StudySession_state_idx" ON "StudySession"("state");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentRecord_sessionId_key" ON "ConsentRecord"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "VetWebParticipantLink_sessionId_key" ON "VetWebParticipantLink"("sessionId");

-- CreateIndex
CREATE INDEX "VetWebParticipantLink_participantHash_idx" ON "VetWebParticipantLink"("participantHash");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_jtiHash_key" ON "VerificationToken"("jtiHash");

-- CreateIndex
CREATE INDEX "VerificationToken_sessionId_idx" ON "VerificationToken"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationEvent_idempotencyKey_key" ON "VerificationEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "VerificationEvent_sessionId_idx" ON "VerificationEvent"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationDecision_sessionId_key" ON "VerificationDecision"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireResponse_sessionId_key" ON "QuestionnaireResponse"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentClaim_sessionId_key" ON "PaymentClaim"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentClaim_duplicateHash_key" ON "PaymentClaim"("duplicateHash");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentClaim_referenceCode_key" ON "PaymentClaim"("referenceCode");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAccount_entraSubject_key" ON "StaffAccount"("entraSubject");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAccount_email_key" ON "StaffAccount"("email");

-- CreateIndex
CREATE INDEX "RoleAssignment_studyId_idx" ON "RoleAssignment"("studyId");

-- CreateIndex
CREATE INDEX "AuditLog_objectType_objectId_idx" ON "AuditLog"("objectType", "objectId");

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VetWebParticipantLink" ADD CONSTRAINT "VetWebParticipantLink_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDecision" ADD CONSTRAINT "VerificationDecision_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentClaim" ADD CONSTRAINT "PaymentClaim_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StaffAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
