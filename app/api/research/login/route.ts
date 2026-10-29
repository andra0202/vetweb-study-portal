import { NextRequest, NextResponse } from "next/server";
import { createResearcherSession, researcherCookieName, researcherPasswordIsValid } from "../../../lib/researcher-auth";

function publicUrl(request: NextRequest, path: string) {
  // Azure's internal request URL is not the same as the public website URL.
  // Prefer the proxy headers Azure supplies to preserve the visitor's real host.
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("x-original-host") || request.headers.get("host") || request.nextUrl.host).split(",")[0].trim();
  const protocol = (request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "")).split(",")[0].trim();
  return new URL(path, `${protocol}://${host}`);
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") || "");
  if (!researcherPasswordIsValid(password)) {
    return NextResponse.redirect(publicUrl(request, "/research/login?error=1"), 303);
  }
  const session = createResearcherSession();
  const response = NextResponse.redirect(publicUrl(request, "/research"), 303);
  response.cookies.set(researcherCookieName, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: session.maxAge,
  });
  return response;
}
