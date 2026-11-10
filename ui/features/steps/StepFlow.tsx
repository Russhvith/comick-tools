"use client";

import { useCallback, useState } from "react";
import { StepCard } from "@/components/molecules/StepCard";
import { ScriptForm } from "@/features/tools/components/ScriptForm";
import type { RunSummary } from "@/types/runs";
import type { StepStatus } from "@/types/steps";
import type { Step, Tool } from "@/types/tools";
import { stepViews } from "./views";
import styles from "./StepFlow.module.css";

type Props = {
  tool: Tool;
  steps: Step[];
  busy: boolean;
  refreshKey: number;
  onStarted: (run: RunSummary) => void;
};

const same = (a: StepStatus | undefined, b: StepStatus) =>
  !!a && a.state === b.state && a.text === b.text && a.ready === b.ready && a.modifiedAt === b.modifiedAt && a.replaceWarning === b.replaceWarning;

/**
 * A tool as a sequence. File steps report where they stand, and script
 * steps wait on the step they `need` and warn before replacing what they
 * `produce`.
 */
export function StepFlow({ tool, steps, busy, refreshKey, onStarted }: Props) {
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({});

  const reporter = useCallback(
    (id: string) => (status: StepStatus) => setStatuses((prev) => (same(prev[id], status) ? prev : { ...prev, [id]: status })),
    [],
  );

  const position = (id: string | undefined) => steps.findIndex((s) => s.id === id) + 1;

  /**
   * A file a script writes is only worth showing when it belongs to the
   * input on screen. While that script's input isn't ready, or is newer
   * than the file, the file is left over from an earlier run: the step is
   * held, its contents hidden, and it doesn't count as ready for anything
   * after it. Statuses are worked out in order, so a held step holds back
   * the steps that need it too.
   */
  const effective: Record<string, { status?: StepStatus; held: string | null }> = {};
  for (const step of steps) {
    const raw = statuses[step.id];
    const producer = steps.find((s) => s.script && s.produces === step.id);
    const input = producer?.needs ? effective[producer.needs]?.status : undefined;
    const exists = raw?.modifiedAt != null;

    if (!producer || !raw) {
      effective[step.id] = { status: raw, held: null };
    } else if (producer.needs && !input?.ready) {
      const n = position(producer.needs);
      effective[step.id] = {
        status: { ...raw, state: "blocked", text: `Waiting for step ${n}`, ready: false },
        held: exists
          ? `Finish step ${n} first. The episodes from the last format are still on disk, and step ${position(producer.id)} replaces them.`
          : null,
      };
    } else if (exists && input?.modifiedAt && raw.modifiedAt && input.modifiedAt > raw.modifiedAt) {
      effective[step.id] = {
        status: { ...raw, state: "blocked", text: "Older than the response", ready: false },
        held: `These episodes were formatted from an earlier response. Run step ${position(producer.id)} again to get the ones for this response.`,
      };
    } else {
      effective[step.id] = { status: raw, held: null };
    }
  }

  return (
    <ol className={styles.flow}>
      {steps.map((step, i) => {
        const index = i + 1;

        if (step.script) {
          const script = tool.scripts.find((s) => s.id === step.script)!;
          const needs = step.needs ? effective[step.needs]?.status : undefined;
          // The raw status, so the warning about hand edits still shows
          // while the file is held.
          const produced = step.produces ? statuses[step.produces] : undefined;
          const blocked = !!step.needs && !needs?.ready;

          let state: StepStatus["state"] = "pending";
          let text = "Ready when you are";
          if (blocked) {
            state = "blocked";
            text = `Waiting for step ${position(step.needs)}`;
          } else if (step.produces) {
            if (!produced?.ready) text = "Ready to run";
            else if (needs?.modifiedAt && produced.modifiedAt && needs.modifiedAt > produced.modifiedAt) text = "The input changed since this last ran";
            else {
              state = "done";
              text = "Up to date";
            }
          }

          return (
            <StepCard key={step.id} index={index} title={step.title} state={state} status={text}>
              {/* Same as a held file step: nothing to fill in until the step before is done. */}
              {blocked ? (
                <p className={styles.waiting}>Finish step {position(step.needs)} first.</p>
              ) : (
                <ScriptForm
                  key={`${tool.id}/${script.id}`}
                  bare
                  hotkey={false}
                  toolId={tool.id}
                  group={tool.group}
                  script={script}
                  busy={busy}
                  onStarted={onStarted}
                  guard={produced?.replaceWarning}
                />
              )}
            </StepCard>
          );
        }

        const View = step.view ? stepViews[step.view] : undefined;
        const file = tool.files.find((f) => f.path === step.file);
        const { status, held } = effective[step.id] ?? { held: null };
        return (
          <StepCard key={step.id} index={index} title={step.title} state={status?.state ?? "pending"} status={status?.text ?? "Loading"}>
            {View && file ? (
              <View toolId={tool.id} file={file} refreshKey={refreshKey} held={held} onStatus={reporter(step.id)} />
            ) : (
              <p className={styles.missing}>This step names a view the UI doesn't have ({step.view ?? "none"}).</p>
            )}
          </StepCard>
        );
      })}
    </ol>
  );
}
