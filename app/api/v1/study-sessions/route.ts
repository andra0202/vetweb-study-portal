import { NextResponse } from "next/server";
import { createStudyState } from "../../../lib/study-verification";

export async function POST() {
  try {
    const { state, expiresAt } = createStudyState();
    const baseUrl = process.env.VETWEB_LOGIN_URL;
    if (!baseUrl) return NextResponse.json({ error: "vetweb_login_not_configured" }, { status: 503 });
    const launchUrl = new URL(baseUrl); launchUrl.searchParams.set("studyState", state);
    return NextResponse.json({ state, expiresAt, launchUrl: launchUrl.toString() });
  } catch { return NextResponse.json({ error: "study_session_not_configured" }, { status: 503 }); }
}
