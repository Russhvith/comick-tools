import type { ReactNode } from "react";
import { groups, toolIcon } from "@/config/tools";
import { cn } from "@/lib/cn";
import type { Tool } from "@/types/tools";
import styles from "./ToolHeader.module.css";

/** `actions` sit on the right of the title, like Start over. */
export function ToolHeader({ tool, actions }: { tool: Tool; actions?: ReactNode }) {
  const Icon = toolIcon(tool.id);
  const group = groups[tool.group];
  return (
    <header className={styles.header}>
      <span className={cn(styles.icon, styles[group.tone])} aria-hidden>
        <Icon size={22} />
      </span>
      <div className={styles.text}>
        <h1 className={styles.title}>{tool.name}</h1>
        <p className={styles.summary}>{tool.summary}</p>
        <p className={cn(styles.audience, styles[group.tone])}>{group.note}</p>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
