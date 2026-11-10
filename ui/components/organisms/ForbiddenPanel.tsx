import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import styles from "./ForbiddenPanel.module.css";

type Props = {
  title: string;
  children: ReactNode;
  /** Buttons or links under the text, like the way back home. */
  actions?: ReactNode;
};

/** The 403 message, used by the /403 page and by overlays that refuse a page. */
export function ForbiddenPanel({ title, children, actions }: Props) {
  return (
    <div className={styles.panel}>
      <span className={styles.icon} aria-hidden>
        <Lock size={22} />
      </span>
      <p className={styles.code}>403</p>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.text}>{children}</div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
