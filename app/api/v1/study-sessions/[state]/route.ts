import { NextResponse } from "next/server";
import { isVerified, verifyStudyState } from "../../../../lib/study-verification";

export async function GET(_: Request, { params }: { params: Promise<{ state: string }> }) {
  const parsed = verifyStudyState(decodeURIComponent((await params).state));
  if (!parsed) return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  return NextResponse.json({ verified: isVerified(parsed.id) });
}
