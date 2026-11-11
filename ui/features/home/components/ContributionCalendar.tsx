// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { CSSProperties } from "react";
import styles from "./ContributionCalendar.module.css";

type Props = {
  /** Commits per day, keyed yyyy-mm-dd. */
  days: Record<string, number>;
  /** Today as yyyy-mm-dd, worked out on the server so it can't disagree with the client. */
  today: string;
};

const CELL = 11;
const GAP = 2;
const STEP = CELL + GAP;
const LEFT = 28;
const TOP = 16;
const WEEKS = 53;

// One hue, brighter for more, so it reads as magnitude on the dark card.
// Level 0 is a step off the card so empty days still show the grid.
const LEVELS = ["#1f2937", "#1e3a8a", "#1d4ed8", "#3b82f6", "#93c5fd"];

const fromKey = (key: string) => new Date(`${key}T00:00:00Z`);
const toKey = (date: Date) => date.toISOString().slice(0, 10);
const label = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function level(count: number, max: number) {
  if (!count) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4)));
}

/** A year of commits as a GitHub style calendar: weeks across, weekdays down. */
export function ContributionCalendar({ days, today }: Props) {
  const end = fromKey(today);
  // Start on the Sunday 52 weeks back, so the last column is this week.
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7 * (WEEKS - 1) - end.getUTCDay());

  const max = Math.max(1, ...Object.values(days));
  const cells: { x: number; y: number; key: string; count: number }[] = [];
  const months: { x: number; name: string }[] = [];
  let lastMonth = -1;

  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + w * 7 + d);
      if (date > end) break;
      const key = toKey(date);
      cells.push({ x: LEFT + w * STEP, y: TOP + d * STEP, key, count: days[key] ?? 0 });
      if (d === 0 && date.getUTCMonth() !== lastMonth) {
        lastMonth = date.getUTCMonth();
        // Skip a label crammed into the first partial column.
        if (w > 0 || date.getUTCDate() <= 7) months.push({ x: LEFT + w * STEP, name: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }) });
      }
    }
  }

  const width = LEFT + WEEKS * STEP;
  const height = TOP + 7 * STEP;
  const total = cells.reduce((sum, c) => sum + c.count, 0);
  let filledIndex = 0;

  return (
    <figure className={styles.figure}>
      <div className={styles.scroll}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          // In rem rather than px so the year grows with the rest of the page
          // on a large screen. 16 is the base size the drawing was laid out at.
          style={{ width: `${width / 16}rem`, height: `${height / 16}rem` }}
          className={styles.svg}
          role="img"
          aria-label={`${total} commits in the last year${total ? `, at most ${max} in a day` : ""}`}
        >
          {months.map((m) => (
            <text key={`${m.name}-${m.x}`} x={m.x} y={10} className={styles.axis}>
              {m.name}
            </text>
          ))}
          {["Mon", "Wed", "Fri"].map((day, i) => (
            <text key={day} x={0} y={TOP + (i * 2 + 1) * STEP + CELL - 2} className={styles.axis}>
              {day}
            </text>
          ))}
          {cells.map((c) => {
            const filled = c.count > 0;
            return (
              <rect
                key={c.key}
                x={c.x}
                y={c.y}
                width={CELL}
                height={CELL}
                rx={2}
                fill={LEVELS[level(c.count, max)]}
                className={filled ? `${styles.cell} ${styles.filled}` : styles.cell}
                style={filled ? ({ "--n": filledIndex++ } as CSSProperties) : undefined}
              >
                <title>{`${c.count === 0 ? "No" : c.count} commit${c.count === 1 ? "" : "s"} on ${label(fromKey(c.key))}`}</title>
              </rect>
            );
          })}
        </svg>
      </div>
      <figcaption className={styles.caption}>
        <span>
          {total.toLocaleString("en-US")} commit{total === 1 ? "" : "s"} in the last year
        </span>
        <span className={styles.legend} aria-hidden>
          Less
          {LEVELS.map((color) => (
            <span key={color} className={styles.swatch} style={{ background: color }} />
          ))}
          More
        </span>
      </figcaption>
    </figure>
  );
}
