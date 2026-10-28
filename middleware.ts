import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const password = process.env.RESEARCHER_DASHBOARD_PASSWORD;
  const username = process.env.RESEARCHER_DASHBOARD_USERNAME || "researcher";
  if (!password) return new NextResponse("Researcher access is not configured.", { status: 503 });

  const authorization = request.headers.get("authorization");
  const supplied = authorization?.startsWith("Basic ") ? atob(authorization.slice(6)) : "";
  if (supplied !== `${username}:${password}`) {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="VetWeb Study Research"' },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/research/:path*"] };
