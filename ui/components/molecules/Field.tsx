import { useId, type ReactNode } from "react";
import styles from "./Field.module.css";

type Props = {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
};

export function Field({ label, hint, children }: Props) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children(id)}
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
