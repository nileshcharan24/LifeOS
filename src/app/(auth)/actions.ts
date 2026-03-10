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

    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          full_name: credentials.full_name,
          email: credentials.email,
          username: credentials.username || credentials.email.split("@")[0],
          // Leave AI instructions unset by default
        },
      },
    });

    if (error) {
      console.error("Error signing up:", error);
      return { error: error.message };
    }

    const userId = data.user?.id;

    // Manual fallback to ensure profile row is created if trigger fails
    if (userId) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        full_name: credentials.full_name,
        email: credentials.email,
        username: credentials.username || credentials.email.split("@")[0],
      });

      if (profileError) {
        console.error("Error inserting profile fallback:", profileError);
        return { error: profileError.message };
      }
    }

    redirect("/dashboard");
  } catch (err) {
    console.error("Unexpected sign up error:", err);
    return {
      error:
        err instanceof Error ? err.message : "Unknown error occurred during signup.",
    };
  }
}
