import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { pageTitle } from "@/config/site";
import { Workbench } from "@/features/workbench/Workbench";
import { listRuns } from "@/lib/server/runs";
import { cookieConfigured, loadTools } from "@/lib/server/tools";
import { localVersion } from "@/lib/server/version";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ group: string; folder: string }> };

async function toolFor({ params }: Params) {
  const { group, folder } = await params;
  const tools = loadTools();
  return { tools, tool: tools.find((t) => t.id === `${group}/${folder}`) };
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const { tool } = await toolFor(props);
  return { title: pageTitle(tool?.name) };
}

// Rendered on the server with the tools and runs already in place, so the
// first paint is the real page rather than a loading state.
export default async function ToolPage(props: Params) {
  const { tools, tool } = await toolFor(props);
  // A renamed or mistyped tool lands on the homepage, which lists them all.
  if (!tool) redirect("/");
  return <Workbench tools={tools} initialToolId={tool.id} cookieSet={cookieConfigured()} version={localVersion()} initialRuns={listRuns()} />;
}
