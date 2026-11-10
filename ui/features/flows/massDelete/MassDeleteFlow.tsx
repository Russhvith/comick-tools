"use client";

import { useState } from "react";
import { BookOpen, Clapperboard, Eye, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { OptionCards } from "@/components/molecules/OptionCards";
import { StepCard } from "@/components/molecules/StepCard";
import { SwitchField } from "@/components/molecules/SwitchField";
import { overLimit, ScriptTextField } from "@/features/tools/components/ScriptTextField";
import { useScriptRun } from "@/features/tools/useScriptRun";
import { comickLink } from "@/lib/slug";
import type { StepState } from "@/types/steps";
import type { Field, FieldValues } from "@/types/tools";
import type { FlowProps } from "../types";
import { describe, kindOf, sourceReady, userIdIn, valuesToSend, type Source } from "./plan";
import styles from "./MassDeleteFlow.module.css";

type TextField = Extract<Field, { type: "text" }>;

const sources = [
  { value: "comic", title: "A comic", description: "Its chapters, narrowed by language, group and number.", icon: BookOpen },
  { value: "anime", title: "An anime", description: "Its episodes, narrowed by number.", icon: Clapperboard },
  { value: "user", title: "One user's uploads", description: "Every chapter they uploaded, narrowed from there.", icon: UserRound },
] as const;

// Each card's input reads like the page it points at, the same way the
// importer shows comick.dev/anime/ in front of its slug.
const inputs: Record<Source, { flag: string; label: string; prefix: string; placeholder: string; hint: string }> = {
  comic: {
    flag: "--slug",
    label: "Comic",
    prefix: "comick.dev/comic/",
    placeholder: "solo-leveling",
    hint: "Paste the comic's link or type its slug.",
  },
  anime: {
    flag: "--slug",
    label: "Anime",
    prefix: "comick.dev/anime/",
    placeholder: "tensei-shitara-slime-datta-ken",
    hint: "Paste the anime's link or type its slug.",
  },
  user: {
    flag: "--user",
    label: "User",
    prefix: "comick.dev/user/",
    placeholder: "dd7d7c2f-b819-4461-93a2-fba1fd2323d2",
    hint: "Paste their profile link or type the user id.",
  },
};

/**
 * The mass deleter as four steps: which list, what in it, why, then go.
 * Fields come from the manifest so labels and hints live in one place, and
 * the run goes through the same server path as any other script.
 */
export function MassDeleteFlow({ tool, busy, onStarted }: FlowProps) {
  const script = tool.scripts[0];
  const [source, setSource] = useState<Source>("comic");
  const [values, setValues] = useState<FieldValues>({});
  const { starting, error, start } = useScriptRun(tool.id, script, onStarted);

  const set = (flag: string, value: string | boolean) => setValues((v) => ({ ...v, [flag]: value }));
  const text = (flag: string) => String(values[flag] ?? "");
  const field = (flag: string) => {
    const found = script.fields.find((f) => f.flag === flag);
    return found?.type === "text" ? found : null;
  };
  const input = (flag: string) => {
    const f = field(flag);
    return f ? <ScriptTextField key={flag} field={f} value={text(flag)} onChange={(v) => set(flag, v)} /> : null;
  };

  const kind = kindOf(source);
  const ready = sourceReady(source, values);

  // The step one input, styled per card. A pasted link is cut down to what
  // the script needs, and a comic link pasted on the anime card (or the
  // other way round) moves to the card it belongs to.
  const where = inputs[source];
  const base = field(where.flag);
  const whereField: TextField | null = base && { ...base, label: where.label, prefix: where.prefix, placeholder: where.placeholder, hint: where.hint, slugFrom: undefined };
  function changeWhere(raw: string) {
    if (source === "user") {
      const id = raw.includes("/") ? userIdIn(raw) : null;
      set("--user", id ?? raw);
      return;
    }
    const link = comickLink(raw, ["comic", "anime"]);
    if (link) {
      setSource(link.section === "anime" ? "anime" : "comic");
      set("--slug", link.slug);
    } else set("--slug", raw);
  }
  const dryRun = values["--dry-run"] === true;
  const reasonField = field("--reason");
  const reasonTooLong = !!reasonField && overLimit(reasonField, text("--reason"));

  // Step one names the list once it's clear, and calls out a link with no
  // user id in it rather than just waiting.
  const sourceStatus: { state: StepState; text: string } = ready
    ? { state: "done", text: source === "user" ? `User ${userIdIn(text("--user"))!.slice(0, 8)}` : text("--slug").trim() }
    : source === "user" && text("--user").trim()
      ? { state: "error", text: "No user id in that" }
      : { state: "pending", text: `Name the ${source === "user" ? "user" : source}` };

  const waiting = <p className={styles.waiting}>Finish step 1 first.</p>;
  const select = text("--select").trim();

  return (
    <ol className={styles.flow}>
      <StepCard index={1} title="Where to delete from" state={sourceStatus.state} status={sourceStatus.text}>
        <div className={styles.body}>
          <OptionCards label="Delete from" options={sources} value={source} onChange={setSource} />
          {whereField && <ScriptTextField field={whereField} value={text(where.flag)} onChange={changeWhere} />}
        </div>
      </StepCard>

      <StepCard
        index={2}
        title="What to delete"
        state={!ready ? "blocked" : select ? "done" : "pending"}
        status={!ready ? "Waiting for step 1" : select ? `${kind === "episode" ? "Episodes" : "Chapters"} ${select}` : "Numbers get asked in the console"}
      >
        {!ready ? (
          waiting
        ) : (
          <div className={styles.body}>
            {source === "user" && <p className={styles.note}>The uploads list only has chapters, so that's what gets deleted.</p>}
            <div className={styles.grid}>
              {source !== "anime" && input("--lang")}
              {source === "comic" && input("--group")}
              {source === "user" && input("--comic")}
              {input("--select")}
            </div>
          </div>
        )}
      </StepCard>

      <StepCard
        index={3}
        title="Why"
        state={!ready ? "blocked" : reasonTooLong ? "error" : text("--reason").trim() ? "done" : "pending"}
        status={!ready ? "Waiting for step 1" : reasonTooLong ? "Too long" : text("--reason").trim() ? "Reason given" : "Asked in the console if left blank"}
      >
        {!ready ? waiting : <div className={styles.body}>{input("--reason")}</div>}
      </StepCard>

      <StepCard index={4} title={dryRun ? "Try it out" : "Delete"} state={ready ? "pending" : "blocked"} status={ready ? (dryRun ? "Dry run, nothing gets deleted" : "Ready when you are") : "Waiting for step 1"}>
        {!ready ? (
          waiting
        ) : (
          <div className={styles.body}>
            <div className={styles.summary} data-dry={dryRun}>
              {dryRun ? <Eye size={18} aria-hidden /> : <Trash2 size={18} aria-hidden />}
              <p>{describe(source, values)}</p>
            </div>
            <div className={styles.toggles}>
              <SwitchField
                label="Dry run, delete nothing"
                hint="Go through every check and list what would be deleted, without deleting anything."
                checked={dryRun}
                onChange={(on) => set("--dry-run", on)}
              />
            </div>
            <footer className={styles.footer}>
              <Button
                size="lg"
                variant={dryRun ? "primary" : "danger"}
                loading={starting}
                disabled={busy || reasonTooLong}
                onClick={() => !busy && !starting && void start(valuesToSend(source, values))}
              >
                {!starting && (dryRun ? <Eye size={15} aria-hidden /> : <Trash2 size={15} aria-hidden />)}
                {starting ? "Starting" : dryRun ? "Start dry run" : "Start deleting"}
              </Button>
              {!dryRun && !starting && (
                <span className={styles.footNote}>
                  Nothing goes until you type <kbd>DELETE</kbd> in the console.
                </span>
              )}
              {busy && !starting && <span className={styles.footNote}>Another run is going. Stop it or wait for it to finish.</span>}
              {error && (
                <span className={styles.error} role="alert">
                  {error}
                </span>
              )}
            </footer>
          </div>
        )}
      </StepCard>
    </ol>
  );
}
