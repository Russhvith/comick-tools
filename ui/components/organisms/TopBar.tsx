import type { ReactNode } from "react";
import { Search, SquareTerminal } from "lucide-react";
import { Kbd } from "@/components/atoms/Kbd";
import styles from "./TopBar.module.css";

type Props = {
  title: string;
  subtitle: string;
  searchLabel: string;
  searchKeys: readonly string[];
  onSearch: () => void;
  end?: ReactNode;
};

export function TopBar({ title, subtitle, searchLabel, searchKeys, onSearch, end }: Props) {
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden>
          <SquareTerminal size={18} />
        </span>
        <span className={styles.names}>
          <span className={styles.title}>{title}</span>
          <span className={styles.subtitle}>{subtitle}</span>
        </span>
      </div>
      <button type="button" className={styles.search} onClick={onSearch}>
        <Search size={16} aria-hidden />
        <span className={styles.searchLabel}>{searchLabel}</span>
        <Kbd keys={searchKeys} />
      </button>
      <div className={styles.end}>{end}</div>
    </header>
  );
}
