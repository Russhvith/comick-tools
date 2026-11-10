import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./Field.module.css";

type Props = {
  label: string;
  hint?: string;
  /** Takes the hint's place while set, so the line under the input doesn't jump. */
  error?: string;
  /** Something small on the label's right, like a character count. */
  aside?: ReactNode;
  className?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
};

export function Field({ label, hint, error, aside, className, children }: Props) {
  const id = useId();
  const note = error ?? hint;
  return (
    <div className={cn(styles.field, className)}>
      <div className={styles.top}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {aside && <span className={styles.aside}>{aside}</span>}
      </div>
      {children(id, note ? `${id}-note` : undefined)}
      {note && (
        <p id={`${id}-note`} className={cn(styles.hint, error && styles.error)}>
          {note}
        </p>
      )}
    </div>
  );
}
