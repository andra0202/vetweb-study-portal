import { NextResponse } from "next/server";
import { researcherCookieName } from "../../../lib/researcher-auth";

export async function POST(request: Request) {
  // Keep redirects on the public host when running behind Azure's proxy.
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/research/login" },
  });
  response.cookies.set(researcherCookieName, "", { path: "/", maxAge: 0 });
  return response;
}
