"use server";

import { signInWithEmail, signUpWithEmail } from "@/services/auth/authService";
import { EmailAuth, SignUpWithEmail } from "@/types/auth";
import { redirect } from "next/navigation";

export async function signInAction(credentials: EmailAuth) {
  const { error } = await signInWithEmail(credentials);
  if (error) {
    console.error("Error signing in:", error);
    // Handle error appropriately
  } else {
    redirect("/dashboard");
  }
}

export async function signUpAction(credentials: SignUpWithEmail) {
  if (!credentials.password) {
    throw new Error("Password is required for sign up.");
  }
  const { error } = await signUpWithEmail(credentials);
  if (error) {
    console.error("Error signing up:", error);
    // Handle error appropriately
  } else {
    redirect("/dashboard");
  }
}
