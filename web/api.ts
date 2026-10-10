import { createClient } from "@supabase/supabase-js";
import type { ActionState } from "../src/lib/types";
import type { Actions } from "../src/components/action-provider";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const db =
  url && key
    ? createClient(url, key, {
        auth: { flowType: "pkce", detectSessionInUrl: true },
      })
    : null;
export function navigate(path: string) {
  window.location.hash = path;
}
function errorMessage(error: { code?: string; message: string }) {
  if (error.code === "P0001" || error.code === "42501") return error.message;
  if (error.code === "23505")
    return "This action was already completed, or another round is still open.";
  if (["23514", "23502", "22P02", "23503"].includes(error.code ?? ""))
    return "Check the required fields and try again.";
  return "We could not save this change. Refresh and try again.";
}
export function browserActions(refresh: () => void): Actions {
  return {
    async mutate(action, _state, form): Promise<ActionState> {
      if (!db) return { message: "Supabase is not configured yet." };
      const args: Record<string, string | boolean> = {};
      for (const [k, v] of form) if (typeof v === "string") args[k] = v;
      if (typeof args.reveal_at === "string" && !args.reveal_at.endsWith("Z"))
        args.reveal_at += "Z";
      let invitation: string | undefined;
      if (action === "generate") {
        const { data, error } = await db.functions.invoke(
          "generate-assignments",
          { body: { event: args.event } },
        );
        if (error || data?.error)
          return {
            message:
              data?.error ??
              "Generation failed. Confirm the server function is deployed, then refresh and try again.",
          };
      } else {
        if (action === "profile")
          args.future_opt_out = form.get("future_opt_out") === "on";
        if (action === "admin-invite") {
          const bytes = crypto.getRandomValues(new Uint8Array(24));
          invitation = Array.from(bytes, (b) =>
            b.toString(16).padStart(2, "0"),
          ).join("");
          const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(invitation),
          );
          args.token_hash = Array.from(new Uint8Array(digest), (b) =>
            b.toString(16).padStart(2, "0"),
          ).join("");
        }
        const { error } = await db.rpc("app_write", {
          p_action: action,
          p_args: args,
        });
        if (error) return { message: errorMessage(error) };
      }
      refresh();
      return {
        ok: true,
        message: invitation
          ? "Invitation created. Share this code privately. It expires in 7 days."
          : "Saved successfully.",
        invitation,
      };
    },
    async authenticate(mode, _state, form): Promise<ActionState> {
      if (!db)
        return {
          message:
            "This app is awaiting Supabase setup. You can explore the sample round.",
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
      if (mode === "register") {
        const name = String(form.get("display_name") ?? "").trim(),
          code = String(form.get("invitation_code") ?? "").trim();
        if (!name || name.length > 60 || code.length < 20 || code.length > 128)
          return { message: "Enter your display name and invitation code." };
        const { error } = await db.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name, invitation_code: code },
            emailRedirectTo: `${location.origin}${location.pathname}`,
          },
        });
        if (error)
          return {
            message:
              "Registration could not be completed. Check your invitation and email, or contact your organizer.",
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
      navigate("/app/dashboard");
      return { ok: true };
    },
    async signOut() {
      if (db) await db.auth.signOut();
      navigate("/");
      refresh();
    },
  };
}
