import type { RunStatus } from "@/types/runs";
import styles from "./StatusDot.module.css";

export function StatusDot({ status }: { status: RunStatus | "pending" }) {
  return <span className={styles.dot} data-status={status} aria-hidden />;
}
