import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { verifyStudyState } from "../../../lib/study-verification";
import { createReferenceCode, encryptGcashNumber, gcashDuplicateHash, normalizeGcashNumber } from "../../../lib/payment-claims";

const bodySchema = z.object({
  state: z.string().min(1),
  gcashNumber: z.string().min(1).max(30),
});

export async function POST(request: NextRequest) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_raffle_claim" }, { status: 400 });

  const studyState = verifyStudyState(body.data.state);
  const normalizedNumber = normalizeGcashNumber(body.data.gcashNumber);
  if (!studyState || !normalizedNumber) return NextResponse.json({ error: "invalid_raffle_claim" }, { status: 400 });

  const session = await prisma.studySession.findUnique({
    where: { id: studyState.id },
    include: { response: true, payment: true },
  });
  if (!session || !session.response || session.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  }
  if (session.payment) return NextResponse.json({ referenceCode: session.payment.referenceCode, alreadySubmitted: true });

  try {
    const claim = await prisma.paymentClaim.create({
      data: {
        sessionId: session.id,
        encryptedNumber: encryptGcashNumber(normalizedNumber),
        duplicateHash: gcashDuplicateHash(normalizedNumber),
        referenceCode: createReferenceCode(),
        state: "RAFFLE_ELIGIBLE",
      },
      select: { referenceCode: true },
    });
    return NextResponse.json({ referenceCode: claim.referenceCode });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002") return NextResponse.json({ error: "duplicate_raffle_entry" }, { status: 409 });
    return NextResponse.json({ error: "raffle_claim_unavailable" }, { status: 503 });
  }
}
