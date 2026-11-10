import { COMICK_HOSTS } from "@/config/comick";

/**
 * The slug from a ComicK link like https://comick.dev/anime/<slug>, when
 * the section before it is one of `sections`. Anything else comes back as
 * typed, so plain slugs and half typed links are left alone. Same rules as
 * slug_from in lib/comick_tools/api.py.
 */
export function slugFrom(text: string, sections: string[]): string {
  if (!text.includes("/")) return text;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text.trim()) ? text.trim() : `https://${text.trim()}`);
  } catch {
    return text;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!COMICK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return text;
  const parts = url.pathname.split("/").filter(Boolean);
  const at = parts.findIndex((p, i) => i < parts.length - 1 && sections.includes(p.toLowerCase()));
  return at === -1 ? text : decodeURIComponent(parts[at + 1]);
}
