import { NextResponse } from "next/server";
import { isVerified, verifyStudyState } from "../../../../lib/study-verification";
import { prisma } from "../../../../lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ state: string }> }) {
  const parsed = verifyStudyState(decodeURIComponent((await params).state));
  if (!parsed) return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  const session = await prisma.studySession.findUnique({ where: { id: parsed.id }, select: { state: true, expiresAt: true } });
  if (!session || session.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  const events = await prisma.verificationEvent.findMany({
    where: { sessionId: parsed.id, eventType: { in: ["pet.registered", "appointment.booked", "appointment.notification_opened", "chatbot.used"] } },
    select: { eventType: true },
  });
  const hasEvent = (eventType: string) => events.some(event => event.eventType === eventType);
  return NextResponse.json({
    verified: isVerified(parsed.id) || session.state === "VERIFIED",
    petRegistered: hasEvent("pet.registered"),
    appointmentBooked: hasEvent("appointment.booked"),
    notificationOpened: hasEvent("appointment.notification_opened"),
    chatbotUsed: hasEvent("chatbot.used"),
  });
}
