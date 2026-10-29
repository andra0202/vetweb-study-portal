import { NextRequest, NextResponse } from "next/server";
import { createResearcherSession, researcherCookieName, researcherPasswordIsValid } from "../../../lib/researcher-auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") || "");
  if (!researcherPasswordIsValid(password)) {
    // Azure App Service can supply an internal container host in request.url.
    // A relative Location keeps the visitor on the public portal hostname.
    return new NextResponse(null, {
      status: 303,
      headers: { Location: "/research/login?error=1" },
    });
  }
  const session = createResearcherSession();
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/research" },
  });
  response.cookies.set(researcherCookieName, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: session.maxAge,
  });
  return response;
}
