import { NextResponse } from "next/server";
import { isVerified, verifyStudyState } from "../../../../lib/study-verification";
import { prisma } from "../../../../lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ state: string }> }) {
  const parsed = verifyStudyState(decodeURIComponent((await params).state));
  if (!parsed) return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  const session = await prisma.studySession.findUnique({ where: { id: parsed.id }, select: { state: true, expiresAt: true } });
  if (!session || session.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  return NextResponse.json({ verified: isVerified(parsed.id) || session.state === "VERIFIED" });
}
