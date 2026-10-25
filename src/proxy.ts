import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, userId } = await updateSession(request);

  if (
    userId &&
    (pathname === "/" || pathname === "/login" || pathname === "/register")
  ) {
    const redirectResponse = NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (!userId && pathname.startsWith("/dashboard")) {
    const redirectResponse = NextResponse.redirect(
      new URL("/login", request.url)
    );
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/register", "/dashboard/:path*"],
};
