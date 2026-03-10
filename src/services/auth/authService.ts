"use client";

import { createClient } from "@/lib/supabase/client";
import { type Provider } from "@supabase/supabase-js";
import { EmailAuth, SignUpWithEmail } from "@/types/auth";

export type OAuthProvider = "google" | "github";

const supabase = createClient();

export const signInWithEmail = async (credentials: EmailAuth) => {
  if (!credentials.password) {
    throw new Error("Password is required for email sign in.");
  }
  return supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
};

export const signInWithOAuth = async (provider: OAuthProvider) => {
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${location.origin}/auth/callback`,
    },
  });
};

export const signUpWithEmail = async (credentials: SignUpWithEmail) => {
  return supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: {
        full_name: credentials.full_name,
        ai_custom_instructions: "I am a soft person who learns with constructive criticism and positive reinforcement. Be firm and critical of my mistakes, but find a middle ground. Suggest improvements in my life and track progress.",
      },
      emailRedirectTo: `${location.origin}/auth/callback`,
    },
  });
};

export const signOut = async () => {
  return supabase.auth.signOut();
};
