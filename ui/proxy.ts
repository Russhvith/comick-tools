import type { NextRequest } from "next/server";
import { rejectRemote } from "@/lib/server/guard";

/**
 * The same Host and Origin check the API routes do, for every page too.
 * Pages show run history and the repo's commits, and a rebinding attack
 * shouldn't get those any more than it gets the API.
 */
export function proxy(request: NextRequest) {
  return rejectRemote(request) ?? undefined;
}

export const config = {
  // Static build files carry nothing private and are asked for constantly.
  matcher: ["/((?!_next/static|_next/image|icon.svg).*)"],
};
