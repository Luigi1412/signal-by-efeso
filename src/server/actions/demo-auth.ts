"use server";

/**
 * Compatibility wrappers for older imports.
 * Prefer `@/server/actions/auth-actions` for new code.
 */
import {
  signInDemo as signInDemoImpl,
  signInWithPassword as signInWithPasswordImpl,
  signOutAction as signOutActionImpl,
} from "./auth-actions";

export async function signInWithPassword(input: {
  email: string;
  password: string;
}): Promise<{ error: string } | void> {
  return signInWithPasswordImpl(input);
}

export async function signInDemo(kind: "member" | "admin" = "member"): Promise<{ error: string } | void> {
  return signInDemoImpl(kind);
}

export async function signOutAction(): Promise<void> {
  return signOutActionImpl();
}
