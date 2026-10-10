import { notFound } from "next/navigation";
import { readData } from "@/lib/data";
import { Shell } from "@/components/shell";
import { StudentView } from "@/components/student";
export const dynamic = "force-dynamic";
export default async function StudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
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
  const data = await readData(section, args);
  return (
    <Shell data={data} section={section}>
      <StudentView data={data} section={section} args={args} />
    </Shell>
  );
}
