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

  return (
    <ol className={styles.flow}>
      {steps.map((step, i) => {
        const index = i + 1;

        if (step.script) {
          const script = tool.scripts.find((s) => s.id === step.script)!;
          const needs = step.needs ? statuses[step.needs] : undefined;
          const produced = step.produces ? statuses[step.produces] : undefined;
          const blocked = !!step.needs && !needs?.ready;

          let state: StepStatus["state"] = "pending";
          let text = "Ready when you are";
          if (blocked) {
            state = "blocked";
            text = step.blockedText ?? "An earlier step comes first";
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
              <ScriptForm
                key={`${tool.id}/${script.id}`}
                bare
                hotkey={false}
                toolId={tool.id}
                group={tool.group}
                script={script}
                busy={busy}
                onStarted={onStarted}
                blockedReason={blocked ? (step.blockedText ?? "An earlier step comes first") : null}
                guard={produced?.replaceWarning}
              />
            </StepCard>
          );
        }

        const View = step.view ? stepViews[step.view] : undefined;
        const file = tool.files.find((f) => f.path === step.file);
        const status = statuses[step.id];
        return (
          <StepCard key={step.id} index={index} title={step.title} state={status?.state ?? "pending"} status={status?.text ?? "Loading"}>
            {View && file ? (
              <View toolId={tool.id} file={file} refreshKey={refreshKey} onStatus={reporter(step.id)} />
            ) : (
              <p className={styles.missing}>This step names a view the UI doesn't have ({step.view ?? "none"}).</p>
            )}
          </StepCard>
        );
      })}
    </ol>
  );
}
