import "server-only";
import { redirect } from "next/navigation";
import { configured, supabase } from "./supabase/server";
import type { AppData } from "./types";
export async function readData(
  section: string,
  args: Record<string, string> = {},
): Promise<AppData> {
  if (!configured()) redirect("/?setup=1");
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/");
  const { data: profile, error: profileError } = await db.rpc("app_read", {
    p_section: "profile",
  });
  if (profileError)
    throw new Error(
      "Your profile could not be loaded. Contact your club organizer.",
    );
  if (section !== "profile" && profile.profile.status !== "approved")
    redirect("/app/profile");
  if (section.startsWith("admin-") && !profile.is_admin)
    redirect("/app/dashboard");
  const { data, error } = await db.rpc("app_read", {
    p_section: section,
    p_args: args,
  });
  if (error)
    throw new Error(
      "This page could not be loaded. Refresh or contact your organizer.",
    );
  return data as AppData;
}
