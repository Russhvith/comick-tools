import type { Metadata } from "next";
import { pageTitle } from "@/config/site";
import { HomePage } from "@/features/home/HomePage";
import { changelog, commitCount, commitsByDay } from "@/lib/server/repo";
import { listRuns } from "@/lib/server/runs";
import { loadTools } from "@/lib/server/tools";
import { localVersion } from "@/lib/server/version";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: pageTitle() };

export default async function Home() {
  const [days, commits, releases] = await Promise.all([commitsByDay(), commitCount(), changelog()]);
  // The date in local time, the same calendar git's short dates use.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return (
    <HomePage
      tools={loadTools()}
      version={localVersion()}
      runCount={listRuns().length}
      commitCount={commits}
      days={days}
      changelog={releases}
      today={today}
    />
  );
}
