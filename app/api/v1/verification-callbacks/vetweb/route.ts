import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { markVerified, verifyStudyState } from "../../../../lib/study-verification";
import { prisma } from "../../../../lib/prisma";

/**
 * Fail-closed boundary for the VetWeb callback. A linked participant must
 * register a pet, book an appointment, open its notification, and use the
 * inquiry chatbot before the study unlocks.
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
  const requiredEvents = ["pet.registered", "appointment.booked", "appointment.notification_opened", "chatbot.used"] as const;
  // A valid signature alone is not enough. Events must come from the linked
  // VetWeb account and follow the participant's guided task sequence.
  const supportedEvent = requiredEvents.includes(event.eventType as typeof requiredEvents[number]);
  const signedSession = supportedEvent ? verifyStudyState(event.studyState) : null;
  const linkedSession = !signedSession && supportedEvent && event.participantHash
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

    // A registration is study evidence only after the participant has linked
    // this exact study code while signed in to the same VetWeb account.
    // A login state or ordinary pet-profile registration alone must not unlock
    // the questionnaire.
    if (!event.participantHash) {
      return NextResponse.json({ error: "study_link_required" }, { status: 403 });
    }
    const link = await prisma.vetWebParticipantLink.findUnique({
      where: { sessionId: session.id },
      select: { participantHash: true },
    });
    if (!link || link.participantHash !== event.participantHash) {
      return NextResponse.json({ error: "study_link_required" }, { status: 403 });
    }

    const hasEvent = async (eventType: string) => Boolean(await prisma.verificationEvent.findFirst({
      where: { sessionId: session.id, eventType },
      select: { id: true },
    }));
    if (event.eventType === "appointment.booked" && !await hasEvent("pet.registered")) {
      return NextResponse.json({ error: "pet_registration_required" }, { status: 409 });
    }
    if (event.eventType === "appointment.notification_opened" && !await hasEvent("appointment.booked")) {
      return NextResponse.json({ error: "appointment_required" }, { status: 409 });
    }
    if (event.eventType === "chatbot.used" && !await hasEvent("appointment.notification_opened")) {
      return NextResponse.json({ error: "notification_required" }, { status: 409 });
    }

    let completed = false;
    await prisma.$transaction(async (tx) => {
      await tx.verificationEvent.upsert({
        where: { idempotencyKey },
        update: {},
        create: {
          sessionId: session.id,
          eventType: event.eventType!,
          occurredAt: new Date(),
          evidenceDigest: createHash("sha256").update(rawBody).digest("hex"),
          idempotencyKey,
        },
      });
      const completedEvents = await tx.verificationEvent.findMany({
        where: { sessionId: session.id, eventType: { in: [...requiredEvents] } },
        select: { eventType: true },
      });
      completed = requiredEvents.every(eventType => completedEvents.some(item => item.eventType === eventType));
      if (!completed) return;
      await tx.verificationDecision.upsert({
        where: { sessionId: session.id },
        update: {
          outcome: "VERIFIED",
          reasons: ["VetWeb confirmed the linked pet profile, appointment booking, appointment notification, and inquiry chatbot tasks."],
          criteria: { requiredEvents },
          source: "vetweb-webhook",
        },
        create: {
          sessionId: session.id,
          outcome: "VERIFIED",
          reasons: ["VetWeb confirmed the linked pet profile, appointment booking, appointment notification, and inquiry chatbot tasks."],
          criteria: { requiredEvents },
          source: "vetweb-webhook",
        },
      });
      await tx.studySession.updateMany({
        where: { id: session.id, state: "TASK_IN_PROGRESS" },
        data: { state: "VERIFIED" },
      });
    });
    if (completed) markVerified(session.id, session.expiresAt instanceof Date ? session.expiresAt.getTime() : session.expiresAt);
    return NextResponse.json({ verified: completed });
  } catch {
    return NextResponse.json({ error: "verification_storage_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ verified: false });
}
