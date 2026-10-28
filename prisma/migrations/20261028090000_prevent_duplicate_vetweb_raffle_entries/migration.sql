-- A verified VetWeb account may receive only one raffle entry, even if it
-- starts another study session or supplies a different GCash number.
ALTER TABLE "PaymentClaim" ADD COLUMN "participantHash" TEXT;

CREATE UNIQUE INDEX "PaymentClaim_participantHash_key"
  ON "PaymentClaim"("participantHash");
