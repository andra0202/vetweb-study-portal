import { NextRequest, NextResponse } from "next/server";
import { createResearcherSession, researcherCookieName, researcherPasswordIsValid } from "../../../lib/researcher-auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") || "");
  if (!researcherPasswordIsValid(password)) {
    return NextResponse.redirect(new URL("/research/login?error=1", request.url), 303);
  }
  const session = createResearcherSession();
  const response = NextResponse.redirect(new URL("/research", request.url), 303);
  response.cookies.set(researcherCookieName, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: session.maxAge,
  });
  return response;
}
