import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: NextRequest) {
  const secret = process.env.VETWEB_WEBHOOK_SECRET;
  const timestamp = request.headers.get("x-vetweb-timestamp");
  const signature = request.headers.get("x-vetweb-signature");
  const raw = await request.text();
  if (!secret || !timestamp || !signature || Math.abs(Date.now() - Date.parse(timestamp)) > 300000) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex"));
  const received = Buffer.from(signature, "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = JSON.parse(raw) as { pairingCode?: string; participantHash?: string };
  if (!body.pairingCode || !body.participantHash) return NextResponse.json({ error: "invalid_pairing" }, { status: 400 });
  const session = await prisma.studySession.findUnique({ where: { pairingCodeHash: createHash("sha256").update(body.pairingCode.trim().toUpperCase()).digest("hex") } });
  if (!session || !session.pairingExpiresAt || session.pairingExpiresAt.getTime() < Date.now()) return NextResponse.json({ error: "invalid_pairing" }, { status: 400 });
  await prisma.vetWebParticipantLink.upsert({ where: { sessionId: session.id }, update: { participantHash: body.participantHash, source: "vetweb-pwa" }, create: { sessionId: session.id, participantHash: body.participantHash, source: "vetweb-pwa" } });
  return NextResponse.json({ paired: true });
}
