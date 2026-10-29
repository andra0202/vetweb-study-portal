import { NextRequest, NextResponse } from "next/server";
import { researcherCookieName } from "../../../lib/researcher-auth";

function publicUrl(request: NextRequest, path: string) {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("x-original-host") || request.headers.get("host") || request.nextUrl.host).split(",")[0].trim();
  const protocol = (request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "")).split(",")[0].trim();
  return new URL(path, `${protocol}://${host}`);
}

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(publicUrl(request, "/research/login"), 303);
  response.cookies.set(researcherCookieName, "", { path: "/", maxAge: 0 });
  return response;
}
