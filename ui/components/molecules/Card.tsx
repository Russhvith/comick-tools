import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./Card.module.css";

type Props = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  label?: string;
};

export function Card({ title, description, actions, children, className, label }: Props) {
  return (
    <section className={cn(styles.card, className)} aria-label={label}>
      {(title || actions) && (
        <header className={styles.header}>
          <div>
            {title && <h2 className={styles.title}>{title}</h2>}
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
