import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { markVerified, verifyStudyState } from "../../../../lib/study-verification";

/**
 * Boundary for the production VetWeb callback. It deliberately rejects all
 * callbacks until durable persistence/idempotency is wired to PostgreSQL.
 * This fail-closed behaviour prevents accidental survey unlocks.
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

  let event: { eventType?: string; studyState?: string };
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "invalid_payload" }, { status: 400 }); }
  // A valid signature alone is not enough. The study is unlocked only after
  // VetWeb reports that the participant has successfully registered a pet.
  const session = event.eventType === "pet.registered" ? verifyStudyState(event.studyState) : null;
  if (!session) return NextResponse.json({ error: "invalid_completion" }, { status: 400 });
  // Development bridge only: replace this in-memory status with PostgreSQL before deployment.
  markVerified(session.id, session.expiresAt);
  return NextResponse.json({ verified: true });
}
