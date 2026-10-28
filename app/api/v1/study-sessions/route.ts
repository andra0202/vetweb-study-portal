import { NextResponse } from "next/server";
import { createStudyState } from "../../../lib/study-verification";
import { prisma } from "../../../lib/prisma";

export async function POST() {
  try {
    const { state, expiresAt } = createStudyState();
    const baseUrl = process.env.VETWEB_LOGIN_URL;
    if (!baseUrl) return NextResponse.json({ error: "vetweb_login_not_configured" }, { status: 503 });
    const parsed = state.split(".");
    const sessionId = parsed[0];
    await prisma.study.upsert({
      where: { id: "vetweb-quality-study" },
      update: {},
      create: { id: "vetweb-quality-study", title: "VetWeb quality evaluation", status: "LOCAL_TEST" },
    });
    await prisma.studySession.create({
      data: {
        id: sessionId,
        studyId: "vetweb-quality-study",
        state: "TASK_IN_PROGRESS",
        taskVersion: "pet-registration-v1",
        expiresAt: new Date(expiresAt),
      },
    });
    const launchUrl = new URL(baseUrl); launchUrl.searchParams.set("studyState", state);
    return NextResponse.json({ state, expiresAt, launchUrl: launchUrl.toString() });
  } catch { return NextResponse.json({ error: "study_session_not_configured" }, { status: 503 }); }
}
