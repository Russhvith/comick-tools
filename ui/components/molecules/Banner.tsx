import type { ReactNode } from "react";
import { Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import styles from "./Banner.module.css";

export function Banner({ tone = "info", children }: { tone?: "info" | "warning"; children: ReactNode }) {
  const Icon = tone === "warning" ? TriangleAlert : Info;
  return (
    <div className={cn(styles.banner, styles[tone])} role={tone === "warning" ? "alert" : "status"}>
      <Icon size={18} aria-hidden className={styles.icon} />
      <div>{children}</div>
    </div>
  );
}
