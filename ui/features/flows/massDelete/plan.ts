// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { FieldValues } from "@/types/tools";

/** Which list the deletes come from. A comic means chapters, an anime episodes. */
export type Source = "comic" | "anime" | "user";
export type Kind = "chapter" | "episode";

/** Same pattern mass_delete.py uses to find the id in a profile link. */
const USER_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function userIdIn(text: string): string | null {
  return USER_ID.exec(text)?.[0].toLowerCase() ?? null;
}

const text = (values: FieldValues, flag: string) => String(values[flag] ?? "").trim();
export const kindOf = (source: Source): Kind => (source === "anime" ? "episode" : "chapter");

/**
 * The flags each choice shows. Anything else in the form is left over
 * from a choice that was switched away from and must not be sent: a slug
 * and a user together, or --type=episode with --user, both make the
 * script stop before doing anything.
 */
export function visibleFlags(source: Source): string[] {
  if (source === "user") return ["--user", "--lang", "--comic", "--select", "--reason", "--dry-run"];
  if (source === "anime") return ["--slug", "--select", "--reason", "--dry-run"];
  return ["--slug", "--lang", "--group", "--select", "--reason", "--dry-run"];
}

/** What actually goes to the server: the visible flags that have a value. */
export function valuesToSend(source: Source, values: FieldValues): FieldValues {
  const out: FieldValues = {};
  for (const flag of visibleFlags(source)) {
    const value = values[flag];
    if (value === true) out[flag] = true;
    else if (typeof value === "string" && value.trim()) out[flag] = value.trim();
  }
  // The script asks chapters or episodes when --type is missing, which the
  // card picked in step one has already answered.
  if (source !== "user") out["--type"] = kindOf(source);
  return out;
}

/** Step one is done once the list it names is clear. */
export function sourceReady(source: Source, values: FieldValues): boolean {
  return source === "user" ? userIdIn(text(values, "--user")) !== null : text(values, "--slug") !== "";
}

/** "Deletes chapters 1-10 in en of solo-leveling, only from Beta Team." */
export function describe(source: Source, values: FieldValues): string {
  const kind = kindOf(source);
  const plural = `${kind}s`;
  const select = text(values, "--select");
  const which = select.toLowerCase() === "all" ? `every ${kind}` : select ? `${plural} ${select}` : plural;
  const picked = select ? "" : ", with the numbers picked in the console";

  const lang = text(values, "--lang").toLowerCase();
  const inLang = kind === "episode" ? "" : lang === "all" ? " in every language" : lang ? ` in ${lang}` : "";

  let from: string;
  let only = "";
  if (source === "user") {
    const id = userIdIn(text(values, "--user"));
    from = id ? ` uploaded by user ${id.slice(0, 8)}` : " uploaded by the user";
    const comic = text(values, "--comic");
    if (comic) only = `, only from ${comic}`;
  } else {
    from = ` of ${text(values, "--slug") || `the ${source}`}`;
    const group = source === "comic" ? text(values, "--group") : "";
    if (group) only = `, only from ${group}`;
  }

  const verb = values["--dry-run"] === true ? "Lists" : "Deletes";
  return `${verb} ${which}${inLang}${from}${only}${picked}.`;
}
