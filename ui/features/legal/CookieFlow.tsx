// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { ArrowRight, Ban, Code, FileKey, Globe, Server } from "lucide-react";
import styles from "./CookieFlow.module.css";

const never = ["Your browser", "ComicK's upload storage", "Crunchyroll", "Gravatar", "GitHub", "Us"];

/**
 * Where the ComicK cookie goes, drawn for the privacy page. The text
 * version of the same picture is in legal/privacy.txt.
 */
export function CookieFlow() {
  return (
    <figure className={styles.figure} aria-label="The cookie goes from .env, through the Python client, to api.comick.dev and nowhere else">
      <div className={styles.flow}>
        <div className={styles.node}>
          <span className={styles.icon} aria-hidden>
            <FileKey size={18} />
          </span>
          <span className={styles.name}>.env</span>
          <span className={styles.where}>On your computer</span>
        </div>
        <div className={styles.link} aria-hidden>
          <span className={styles.linkLabel}>read by</span>
          <ArrowRight size={16} />
        </div>
        <div className={styles.node}>
          <span className={styles.icon} aria-hidden>
            <Code size={18} />
          </span>
          <span className={styles.name}>Python client</span>
          <span className={styles.where}>lib/comick_tools</span>
        </div>
        <div className={styles.link} aria-hidden>
          <span className={styles.linkLabel}>Cookie header</span>
          <ArrowRight size={16} />
        </div>
        <div className={`${styles.node} ${styles.target}`}>
          <span className={styles.icon} aria-hidden>
            <Server size={18} />
          </span>
          <span className={styles.name}>api.comick.dev</span>
          <span className={styles.where}>The only place it goes</span>
        </div>
      </div>

      <div className={styles.never}>
        <span className={styles.neverLabel}>
          <Ban size={14} aria-hidden /> Never sent to
        </span>
        <ul className={styles.chips}>
          {never.map((n) => (
            <li key={n}>
              <Globe size={12} aria-hidden />
              {n}
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
