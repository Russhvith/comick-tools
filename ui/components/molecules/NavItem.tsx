import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import styles from "./NavItem.module.css";

type Props = {
  icon: LucideIcon;
  label: string;
  detail?: string;
  tone?: "primary" | "destructive" | "success";
  active?: boolean;
  onSelect: () => void;
};

export function NavItem({ icon: Icon, label, detail, tone = "primary", active, onSelect }: Props) {
  return (
    <button type="button" className={cn(styles.item, active && styles.active)} aria-current={active ? "page" : undefined} onClick={onSelect}>
      <Icon size={16} aria-hidden className={cn(styles.icon, styles[tone])} />
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {detail && <span className={styles.detail}>{detail}</span>}
      </span>
    </button>
  );
}
