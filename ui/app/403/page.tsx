import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { LogoMark } from "@/components/atoms/LogoMark";
import { pageTitle } from "@/config/site";
import styles from "./page.module.css";

export const metadata: Metadata = { title: pageTitle("Forbidden") };

// A page to send people to when they can't have what they asked for. Not
// wired up to anything yet, it only needs to look right when it is.
export default function Forbidden() {
  return (
    <main className={styles.page}>
      <div className={styles.box}>
        <Link href="/" className={styles.logo} aria-label="ComicK Tools, home">
          <LogoMark size={36} />
        </Link>
        <span className={styles.icon} aria-hidden>
          <Lock size={22} />
        </span>
        <p className={styles.code}>403</p>
        <h1 className={styles.title}>You can&apos;t open this page</h1>
        <p className={styles.text}>
          Your account doesn&apos;t have access to it. If you think it should, ask whoever runs this ComicK Tools to check your role.
        </p>
        <Link href="/" className={styles.button}>
          <ArrowLeft size={15} aria-hidden /> Back to the homepage
        </Link>
      </div>
    </main>
  );
}
