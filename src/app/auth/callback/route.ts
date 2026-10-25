import { NextResponse, type NextRequest } from "next/server";
import { ensureUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const candidate = next ? new URL(next, request.url) : null;
  const destination =
    next?.startsWith("/") && candidate?.origin === request.nextUrl.origin
      ? candidate
      : new URL("/dashboard", request.url);
  const supabase = await createClient();

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback", request.url)
    );
  }

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("Auth callback exchange error:", exchangeError);
    return NextResponse.redirect(
      new URL("/login?error=auth_callback", request.url)
    );
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    console.error("Auth callback user error:", error);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("Auth callback sign-out error:", signOutError);
    }
    return NextResponse.redirect(
      new URL("/login?error=auth_callback", request.url)
    );
  }

  try {
    await ensureUserProfile(data.user);
  } catch (profileError) {
    console.error("Auth callback profile error:", profileError);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("Auth callback sign-out error:", signOutError);
    }
    return NextResponse.redirect(
      new URL("/login?error=profile_setup", request.url)
    );
  }

  return NextResponse.redirect(destination);
}
