import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import styles from "./OptionCards.module.css";

type Option<T extends string> = { value: T; title: string; description: string; icon: LucideIcon };

type Props<T extends string> = {
  /** What's being chosen, for screen readers. */
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** A few big choices side by side, each with a line saying what it means. */
export function OptionCards<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={styles.cards}>
      {options.map(({ value: v, title, description, icon: Icon }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === value}
          className={cn(styles.card, v === value && styles.selected)}
          onClick={() => v !== value && onChange(v)}
        >
          <span className={styles.icon} aria-hidden>
            <Icon size={18} />
          </span>
          <span className={styles.text}>
            <span className={styles.title}>{title}</span>
            <span className={styles.description}>{description}</span>
          </span>
          <span className={styles.radio} aria-hidden />
        </button>
      ))}
    </div>
  );
}
