import { groups, toolIcon } from "@/config/tools";
import { cn } from "@/lib/cn";
import type { Tool } from "@/types/tools";
import styles from "./ToolHeader.module.css";

export function ToolHeader({ tool }: { tool: Tool }) {
  const Icon = toolIcon(tool.id);
  const group = groups[tool.group];
  return (
    <header className={styles.header}>
      <span className={cn(styles.icon, styles[group.tone])} aria-hidden>
        <Icon size={22} />
      </span>
      <div>
        <h1 className={styles.title}>{tool.name}</h1>
        <p className={styles.summary}>{tool.summary}</p>
        <p className={cn(styles.audience, styles[group.tone])}>{group.note}</p>
      </div>
    </header>
  );
}
