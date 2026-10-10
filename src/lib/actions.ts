"use server";
import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { configured, supabase } from "./supabase/server";
import { generateAssignments, type Assignment } from "./assignments";
import type { ActionState } from "./types";

function readableError(error: { code?: string; message: string }): string {
  if (error.code === "P0001" || error.code === "42501") return error.message;
  if (error.code === "23505")
    return "This action was already completed, or another round is still open.";
  if (
    error.code === "23514" ||
    error.code === "23502" ||
    error.code === "22P02" ||
    error.code === "23503"
  )
    return "Check the required fields and try again.";
  return "We could not save this change. Refresh and try again.";
}
export async function mutate(
  action: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!configured()) return { message: "Supabase is not configured yet." };
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { message: "Your session has expired. Sign in again." };
  const args: Record<string, string | boolean> = {};
  for (const [key, value] of form) {
    if (!key.startsWith("$") && typeof value === "string") args[key] = value;
  }
  let invitation: string | undefined;
  if (typeof args.reveal_at === "string" && !args.reveal_at.endsWith("Z"))
    args.reveal_at += "Z";
  if (action === "generate") {
    const { data, error } = await db.rpc("assignment_context", {
      p_event: args.event,
    });
    if (error) return { message: readableError(error) };
    try {
      const edges = generateAssignments(
        data.participants as string[],
        data.previous as Assignment[],
      );
      const saved = await db.rpc("commit_assignments", {
        p_event: args.event,
        p_version: data.version,
        p_edges: edges,
      });
      if (saved.error) return { message: readableError(saved.error) };
    } catch (error) {
      return {
        message:
          error instanceof Error
            ? error.message
            : "Assignment generation failed.",
      };
    }
  } else {
    if (action === "admin-invite") {
      invitation = randomBytes(24).toString("base64url");
      args.token_hash = createHash("sha256").update(invitation).digest("hex");
    }
    if (action === "profile")
      args.future_opt_out = form.get("future_opt_out") === "on";
    const { error } = await db.rpc("app_write", {
      p_action: action,
      p_args: args,
    });
    if (error) return { message: readableError(error) };
  }
  revalidatePath("/app", "layout");
  revalidatePath("/admin", "layout");
  return {
    ok: true,
    message: invitation
      ? "Invitation created. Share this code privately with the invited student. It expires in 7 days."
      : "Saved successfully.",
    invitation,
  };
}
export async function authenticate(
  mode: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!configured())
    return {
      message:
        "This app is awaiting Supabase setup. The preview is available below.",
    };
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length < 12 ||
    password.length > 128
  )
    return {
      message:
        "Enter a valid email and a password between 12 and 128 characters.",
    };
  const db = await supabase();
  if (mode === "register") {
    const name = String(form.get("display_name") ?? "").trim();
    const code = String(form.get("invitation_code") ?? "").trim();
    if (!name || name.length > 60 || code.length < 20 || code.length > 128)
      return {
        message:
          "Enter your display name and the invitation code from your organizer.",
      };
    const { error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name, invitation_code: code },
        emailRedirectTo: `${process.env.APP_URL ?? "http://localhost:3000"}/auth/confirm`,
      },
    });
    if (error)
      return {
        message:
          "Registration could not be completed. Check your invitation and email, or ask your organizer for help.",
      };
    return {
      ok: true,
      message:
        "Check your email to confirm your account. Your organizer will then approve your membership.",
    };
  }
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error)
    return {
      message:
        "Sign-in failed. Check your email, password, and email confirmation.",
    };
  redirect("/app/dashboard");
}
export async function signOut() {
  if (configured()) {
    const db = await supabase();
    await db.auth.signOut();
  }
  redirect("/");
}
