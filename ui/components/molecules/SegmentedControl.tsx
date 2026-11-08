import { cn } from "@/lib/cn";
import styles from "./SegmentedControl.module.css";

type Option = { value: string; label: string };

type Props = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label: string;
};

/** The same pill switch ComicK uses for Comic / Anime. */
export function SegmentedControl({ options, value, onChange, label }: Props) {
  return (
    <div role="tablist" aria-label={label} className={styles.group}>
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          type="button"
          aria-selected={option.value === value}
          className={cn(styles.segment, option.value === value && styles.active)}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
