import { NextResponse } from "next/server";
import { researcherCookieName } from "../../../lib/researcher-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/research/login", request.url), 303);
  response.cookies.set(researcherCookieName, "", { path: "/", maxAge: 0 });
  return response;
}
