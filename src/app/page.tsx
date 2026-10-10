import { WelcomeView } from "@/components/welcome";
import { configured } from "@/lib/supabase/server";
export default async function Welcome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <WelcomeView
      ready={configured()}
      confirmation={(await searchParams).confirmation}
    />
  );
}
