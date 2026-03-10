"use server";

import { redirect } from "next/navigation";
import { EmailAuth, SignUpWithEmail } from "@/types/auth";
import { createClient } from "@/lib/supabase/server";

export async function signInAction(credentials: EmailAuth) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password || "",
  });

  if (error) {
    console.error("Error signing in:", error);
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signUpAction(credentials: SignUpWithEmail & { username?: string }) {
  try {
    if (!credentials.password) {
      throw new Error("Password is required for sign up.");
    }

    const supabase = await createClient();

    // Normalize username (fallback to email prefix) and ensure uniqueness before creating auth user
    const normalizedUsername = credentials.username || credentials.email.split("@")[0];

    const { data: existingUsername, error: usernameCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (usernameCheckError) {
      console.error("Error checking username availability:", usernameCheckError);
      return { error: "Unable to verify username availability. Please try again." };
    }

    if (existingUsername?.id) {
      return { error: "Username is already taken. Please choose a different one." };
    }

    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          full_name: credentials.full_name,
          email: credentials.email,
          username: normalizedUsername,
          // Leave AI instructions unset by default
        },
      },
    });

    if (error) {
      console.error("Error signing up:", error);
      return { error: error.message };
    }

    const userId = data.user?.id;

    // Manual fallback to ensure profile row is created if trigger fails.
    // Use upsert to avoid duplicate key errors if the trigger already created the row.
    if (userId) {
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          full_name: credentials.full_name,
          email: credentials.email,
          username: normalizedUsername,
        },
        { onConflict: "id" }
      );

      if (profileError) {
        console.error("Error upserting profile fallback:", profileError);
        return { error: profileError.message };
      }
    }

    // Instead of throwing a NextRedirect to the client invocation, return success
    return { success: true };
  } catch (err) {
    console.error("Unexpected sign up error:", err);
    return {
      error:
        err instanceof Error ? err.message : "Unknown error occurred during signup.",
    };
  }
}
