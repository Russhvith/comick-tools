import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Kbd } from "@/components/atoms/Kbd";
import { LogoMark } from "@/components/atoms/LogoMark";
import styles from "./TopBar.module.css";

type Props = {
  /** The name, split so the second part can carry the accent. */
  wordmark: { lead: string; accent: string };
  subtitle: string;
  searchLabel: string;
  searchKeys: readonly string[];
  onSearch: () => void;
  end?: ReactNode;
};

export function TopBar({ wordmark, subtitle, searchLabel, searchKeys, onSearch, end }: Props) {
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <span className={styles.logo}>
          <LogoMark size={34} />
        </span>
        <span className={styles.names}>
          <span className={styles.title}>
            {wordmark.lead} <span className={styles.accent}>{wordmark.accent}</span>
          </span>
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
