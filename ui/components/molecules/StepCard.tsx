import type { ReactNode } from "react";
import { Check, TriangleAlert } from "lucide-react";
import type { StepState } from "@/types/steps";
import styles from "./StepCard.module.css";

type Props = {
  /** Position in the sequence, shown in the marker until the step is done. */
  index: number;
  title: string;
  state: StepState;
  /** One specific line about where the step stands. */
  status: string;
  children: ReactNode;
};

/** One stage of a pipeline. Render inside an `<ol>`, the marker is the number. */
export function StepCard({ index, title, state, status, children }: Props) {
  return (
    <li className={styles.step} data-state={state}>
      <span className={styles.marker} aria-hidden>
        {state === "done" ? <Check size={14} strokeWidth={3} /> : state === "error" ? <TriangleAlert size={14} /> : index}
      </span>
      <section className={styles.card} aria-label={title}>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.status} data-state={state}>
            {status}
          </p>
        </header>
        <div className={styles.body}>{children}</div>
      </section>
    </li>
  );
}
