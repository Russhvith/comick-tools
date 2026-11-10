/** The roles ComicK hands out, lowest to highest. Anything else counts as "user". */
export const ROLES = ["user", "uploader", "trusted", "moderator", "admin"] as const;
export type Role = (typeof ROLES)[number];

/**
 * The ComicK account behind the cookie in .env, cut down to what the page
 * shows. The email and the cookie never leave the server.
 */
export type Account =
  | {
      state: "signed-in";
      id: string;
      username: string;
      role: Role;
      /** Gravatar, the same picture comick.dev shows. */
      avatar: string;
      profileUrl: string;
      karma: number | null;
      uploads: number | null;
      comments: number | null;
      following: number | null;
      memberSince: string | null;
      lastActive: string | null;
      checkedAt: number;
    }
  | { state: "no-cookie"; checkedAt: number }
  | { state: "rejected"; checkedAt: number }
  | { state: "inactive"; username: string | null; checkedAt: number }
  | { state: "error"; message: string; checkedAt: number };

/** Whether a role can use the admin tools. */
export function canUseAdmin(role: Role): boolean {
  return role === "trusted" || role === "moderator" || role === "admin";
}
