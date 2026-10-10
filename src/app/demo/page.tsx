import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { StudentView } from "@/components/student";
import { demoData } from "@/lib/demo";
// This isolated route never calls Supabase and never persists sample data.
export default async function Demo({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const section = (await searchParams).section ?? "dashboard";
  if (
    ![
      "dashboard",
      "friend",
      "inbox",
      "send",
      "missions",
      "reveal",
      "profile",
      "join",
      "history",
    ].includes(section)
  )
    notFound();
  const data = demoData();
  return (
    <Shell data={data} section={section} demo>
      <StudentView data={data} section={section} demo />
    </Shell>
  );
}
