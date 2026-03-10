import { createClient } from "@/lib/supabase/server";
import { EmailAuth, SignUpWithEmail } from "@/types/auth";
import { cookies } from "next/headers";

export const signInWithEmail = async (credentials: EmailAuth) => {
  const supabase = await createClient();

  if (!credentials.password) {
    throw new Error("Password is required for email sign in.");
  }
  
  return supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
};

export const signUpWithEmail = async (credentials: SignUpWithEmail) => {
  const supabase = await createClient();
  
  return supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: {
        full_name: credentials.full_name,
        ai_custom_instructions: "I am a soft person who learns with constructive criticism and positive reinforcement. Be firm and critical of my mistakes, but find a middle ground. Suggest improvements in my life and track progress.",
      },
    },
  });
};
