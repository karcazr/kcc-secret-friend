import { notFound } from "next/navigation";
import { readData } from "@/lib/data";
import { Shell } from "@/components/shell";
import { AdminView } from "@/components/admin";
export const dynamic = "force-dynamic";
export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
  if (
    ![
      "overview",
      "participants",
      "events",
      "assignments",
      "missions",
      "reports",
      "announcements",
    ].includes(section)
  )
    notFound();
  const query = await searchParams;
  const args = Object.fromEntries(
    Object.entries(query).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  args.page = String(
    Math.max(
      1,
      Math.min(2147483647, Number.parseInt(args.page || "1", 10) || 1),
    ),
  );
  const data = await readData(`admin-${section}`, args);
  return (
    <Shell data={data} section={section} admin>
      <AdminView data={data} section={section} args={args} />
    </Shell>
  );
}
