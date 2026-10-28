/*
  Warnings:

  - A unique constraint covering the columns `[pairingCodeHash]` on the table `StudySession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "StudySession" ADD COLUMN     "pairingCodeHash" TEXT,
ADD COLUMN     "pairingExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "StudySession_pairingCodeHash_key" ON "StudySession"("pairingCodeHash");
