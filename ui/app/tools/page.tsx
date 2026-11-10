import { redirect } from "next/navigation";
import { loadTools } from "@/lib/server/tools";

export const dynamic = "force-dynamic";

// /tools on its own opens the first tool, the way the app used to start.
export default function ToolsIndex() {
  const first = loadTools()[0];
  redirect(first ? `/tools/${first.id}` : "/");
}
