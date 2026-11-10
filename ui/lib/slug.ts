import { COMICK_HOSTS } from "@/config/comick";

/**
 * The slug from a ComicK link like https://comick.dev/anime/<slug>, when
 * the section before it is one of `sections`. Anything else comes back as
 * typed, so plain slugs and half typed links are left alone. Same rules as
 * slug_from in lib/comick_tools/api.py.
 */
export function slugFrom(text: string, sections: string[]): string {
  return comickLink(text, sections)?.slug ?? text;
}

/**
 * The section and slug of a ComicK link, like { section: "anime", slug:
 * "some-show" }, or null for anything that isn't one of those links.
 */
export function comickLink(text: string, sections: string[]): { section: string; slug: string } | null {
  if (!text.includes("/")) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text.trim()) ? text.trim() : `https://${text.trim()}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!COMICK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const at = parts.findIndex((p, i) => i < parts.length - 1 && sections.includes(p.toLowerCase()));
  return at === -1 ? null : { section: parts[at].toLowerCase(), slug: decodeURIComponent(parts[at + 1]) };
}
