import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { isVerified, verifyStudyState } from "../../../lib/study-verification";

const rating = z.enum(["1", "2", "3", "4", "5"]);
const bodySchema = z.object({
  state: z.string().min(1),
  eligibility: z.object({
    role: z.string().min(1),
    adult: z.literal("yes"),
    usedVetWeb: z.literal("yes"),
    anotherSystem: z.enum(["yes", "no"]).optional(),
    anotherSystemDetail: z.string().max(500).optional(),
  }),
  ratings: z.record(z.string(), rating),
  feedback: z.string().max(2000).optional(),
});

const requiredCodes = ["A4", "B1", "B3", "B4", "C2", "C3", "D1", "D2", "D3", "D4", "E1", "E2", "F1", "F4"];

export async function POST(request: NextRequest) {
  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) return NextResponse.json({ error: "invalid_questionnaire_response" }, { status: 400 });

  const studyState = verifyStudyState(parsedBody.data.state);
  if (!studyState) return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  if (!requiredCodes.every(code => parsedBody.data.ratings[code])) {
    return NextResponse.json({ error: "incomplete_ratings" }, { status: 400 });
  }

  const session = await prisma.studySession.findUnique({ where: { id: studyState.id }, select: { state: true, expiresAt: true } });
  if (!session || session.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  if (session.state !== "VERIFIED" && !isVerified(studyState.id)) {
    return NextResponse.json({ error: "task_not_verified" }, { status: 403 });
  }

  const response = await prisma.$transaction(async tx => {
    await tx.studySession.update({ where: { id: studyState.id }, data: { state: "SURVEY_SUBMITTED" } });
    return tx.questionnaireResponse.upsert({
      where: { sessionId: studyState.id },
      update: { definitionVersion: "2026-10-28", answers: parsedBody.data },
      create: { sessionId: studyState.id, definitionVersion: "2026-10-28", answers: parsedBody.data },
    });
  });

  return NextResponse.json({ submissionId: response.id });
}
