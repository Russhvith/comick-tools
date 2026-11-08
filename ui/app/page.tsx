import App from "@/components/App";
import { cookieConfigured, loadTools } from "@/lib/tools";
import { listRuns } from "@/lib/runs";
import { localVersion } from "@/lib/version";

export const dynamic = "force-dynamic";

export default function Page() {
  return <App tools={loadTools()} cookieSet={cookieConfigured()} version={localVersion()} initialRuns={listRuns()} />;
}
