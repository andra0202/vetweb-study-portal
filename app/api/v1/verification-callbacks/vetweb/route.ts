import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { markVerified, verifyStudyState } from "../../../../lib/study-verification";
import { prisma } from "../../../../lib/prisma";

/**
 * Fail-closed boundary for the VetWeb callback. A valid signed pet-registration
 * event is recorded idempotently before it can unlock the questionnaire.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.VETWEB_WEBHOOK_SECRET;
  const timestamp = request.headers.get("x-vetweb-timestamp");
  const signature = request.headers.get("x-vetweb-signature");
  const rawBody = await request.text();

  if (!secret || !timestamp || !signature) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ageMs = Math.abs(Date.now() - Date.parse(timestamp));
  if (!Number.isFinite(ageMs) || ageMs > 5 * 60_000) {
    return NextResponse.json({ error: "stale_callback" }, { status: 401 });
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const received = Buffer.from(signature, "hex");
  const actual = Buffer.from(expected, "hex");
  if (received.length !== actual.length || !timingSafeEqual(received, actual)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let event: { eventType?: string; studyState?: string; participantHash?: string };
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "invalid_payload" }, { status: 400 }); }
  // A valid signature alone is not enough. The study is unlocked only after
  // VetWeb reports that the participant has successfully registered a pet.
  const signedSession = event.eventType === "pet.registered" ? verifyStudyState(event.studyState) : null;
  const linkedSession = !signedSession && event.eventType === "pet.registered" && event.participantHash
    ? await prisma.vetWebParticipantLink.findFirst({ where: { participantHash: event.participantHash }, include: { session: true }, orderBy: { linkedAt: "desc" } })
    : null;
  const session = signedSession ? { id: signedSession.id, expiresAt: signedSession.expiresAt } : linkedSession?.session;
  const expiry = session ? (session.expiresAt instanceof Date ? session.expiresAt.getTime() : session.expiresAt) : 0;
  if (!session || expiry < Date.now()) return NextResponse.json({ error: "invalid_completion" }, { status: 400 });
  const idempotencyKey = createHash("sha256").update(rawBody).digest("hex");

  try {
    const storedSession = await prisma.studySession.findUnique({
      where: { id: session.id },
      select: { id: true, expiresAt: true },
    });
    if (!storedSession || storedSession.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "invalid_completion" }, { status: 400 });
    }

    if (event.participantHash) {
      const existingLink = await prisma.vetWebParticipantLink.findFirst({
        where: { participantHash: event.participantHash },
        select: { sessionId: true },
      });
      if (existingLink && existingLink.sessionId !== session.id) {
        return NextResponse.json({ error: "study_already_linked" }, { status: 409 });
      }
    }

    await prisma.$transaction(async (tx) => {
      if (event.participantHash) {
        await tx.vetWebParticipantLink.upsert({
          where: { sessionId: session.id },
          update: { participantHash: event.participantHash, source: "vetweb-webhook" },
          create: { sessionId: session.id, participantHash: event.participantHash, source: "vetweb-webhook" },
        });
      }
      await tx.verificationEvent.upsert({
        where: { idempotencyKey },
        update: {},
        create: {
          sessionId: session.id,
          eventType: "pet.registered",
          occurredAt: new Date(),
          evidenceDigest: createHash("sha256").update(rawBody).digest("hex"),
          idempotencyKey,
        },
      });
      await tx.verificationDecision.upsert({
        where: { sessionId: session.id },
        update: {
          outcome: "VERIFIED",
          reasons: ["VetWeb reported a successfully registered pet."],
          criteria: { eventType: "pet.registered" },
          source: "vetweb-webhook",
        },
        create: {
          sessionId: session.id,
          outcome: "VERIFIED",
          reasons: ["VetWeb reported a successfully registered pet."],
          criteria: { eventType: "pet.registered" },
          source: "vetweb-webhook",
        },
      });
      await tx.studySession.updateMany({
        where: { id: session.id, state: "TASK_IN_PROGRESS" },
        data: { state: "VERIFIED" },
      });
    });
  } catch {
    return NextResponse.json({ error: "verification_storage_unavailable" }, { status: 503 });
  }

  markVerified(session.id, session.expiresAt instanceof Date ? session.expiresAt.getTime() : session.expiresAt);
  return NextResponse.json({ verified: true });
}
