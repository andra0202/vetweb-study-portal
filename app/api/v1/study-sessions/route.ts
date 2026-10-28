import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
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
    const pairingCode = randomBytes(5).toString("hex").toUpperCase();
    await prisma.studySession.create({
      data: {
        id: sessionId,
        studyId: "vetweb-quality-study",
        state: "TASK_IN_PROGRESS",
        taskVersion: "pet-registration-v1",
        pairingCodeHash: createHash("sha256").update(pairingCode).digest("hex"),
        pairingExpiresAt: new Date(expiresAt),
        expiresAt: new Date(expiresAt),
      },
    });
    const launchUrl = new URL(baseUrl); launchUrl.searchParams.set("studyState", state);
    return NextResponse.json({ state, expiresAt, pairingCode, launchUrl: launchUrl.toString() });
  } catch { return NextResponse.json({ error: "study_session_not_configured" }, { status: 503 }); }
}
