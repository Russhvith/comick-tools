import type { Metadata } from "next";
import { pageTitle } from "@/config/site";
import { Workbench } from "@/features/workbench/Workbench";
import { listRuns } from "@/lib/server/runs";
import { cookieConfigured, loadTools } from "@/lib/server/tools";
import { localVersion } from "@/lib/server/version";

export const dynamic = "force-dynamic";

// The page opens on the first tool, so the tab says so from the first
// paint. The workbench keeps it in step after that.
export function generateMetadata(): Metadata {
  return { title: pageTitle(loadTools()[0]?.name) };
}

// Rendered on the server with the tools and runs already in place, so the
// first paint is the real page rather than a loading state.
export default function Page() {
  return <Workbench tools={loadTools()} cookieSet={cookieConfigured()} version={localVersion()} initialRuns={listRuns()} />;
}
