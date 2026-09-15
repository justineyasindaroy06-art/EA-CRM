"use server";

import { redirect } from "next/navigation";
import { verifyCredentials, createSession } from "@/lib/auth";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  let valid: boolean;
  try {
    valid = await verifyCredentials(email, password);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Login is not configured." };
  }

  if (!valid) {
    return { error: "Invalid email or password." };
  }

  await createSession(email);
  redirect(next || "/");
}
