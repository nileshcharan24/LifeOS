import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// This Route Handler is the landing point after Google redirects back to your app.
//
// Flow:
//  1. User clicks "Sign in with Google" → browser goes to Google's login page
//  2. User approves → Google redirects to this URL with ?code=xxxx
//  3. We exchange that code for a Supabase session (access + refresh tokens)
//  4. Supabase writes the session into an httpOnly cookie
//  5. We redirect the user to the dashboard — they are now logged in

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  // Google can return an error param if the user denied access
  if (error) {
    console.error("OAuth error from Google:", error);
    return NextResponse.redirect(`${origin}/login?error=oauth_denied`);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Session exchange failed:", exchangeError.message);
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    // Session is set — send the user into the app
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // No code and no error — something unexpected happened
  return NextResponse.redirect(`${origin}/login?error=oauth_missing_code`);
}
