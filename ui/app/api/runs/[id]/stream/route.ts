import { rejectRemote } from "@/lib/server/guard";
import { getRun, subscribe, type RunEvent } from "@/lib/server/runs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-sent events for one run: everything printed so far, then each new
 * chunk as it arrives, then an exit event. Opening it again later replays
 * the backlog, so a reloaded page picks up where it left off.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  const run = getRun((await params).id);
  if (!run) return new Response("No such run", { status: 404 });

  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: RunEvent | { type: "ping" }) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          cleanup();
        }
      };
      const { backlog, unsubscribe } = subscribe(run, (event) => {
        send(event);
        if (event.type === "exit") {
          cleanup();
          try {
            controller.close();
          } catch {}
        }
      });
      // Proxies and browsers drop idle event streams, a comment-sized ping
      // keeps a long quiet prompt alive.
      const ping = setInterval(() => send({ type: "ping" }), 15_000);
      cleanup = () => {
        clearInterval(ping);
        unsubscribe();
      };
      if (backlog) send({ type: "output", text: backlog });
      if (run.status !== "running") {
        send({ type: "exit", status: run.status, code: run.code });
        cleanup();
        controller.close();
      }
      req.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
