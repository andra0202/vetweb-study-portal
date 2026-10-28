-- The study code may be linked to only one study session for each verified
-- VetWeb account. This blocks repeat participation before questionnaire access.
CREATE UNIQUE INDEX "VetWebParticipantLink_participantHash_key"
  ON "VetWebParticipantLink"("participantHash");
