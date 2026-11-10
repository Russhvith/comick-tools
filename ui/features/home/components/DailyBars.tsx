import styles from "./DailyBars.module.css";

type Props = {
  days: Record<string, number>;
  today: string;
  /** How many days back, today included. */
  span?: number;
};

const H = 120;
const PAD_LEFT = 24;
const PAD_BOTTOM = 18;
const PAD_TOP = 14;
const SLOT = 18;
const BAR = 12;

const fromKey = (key: string) => new Date(`${key}T00:00:00Z`);
const short = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** A column per day with the top corners rounded and the base square. */
function column(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Commits a day over the last few weeks, one series, no legend needed. */
export function DailyBars({ days, today, span = 30 }: Props) {
  const end = fromKey(today);
  const series = Array.from({ length: span }, (_, i) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (span - 1 - i));
    const key = date.toISOString().slice(0, 10);
    return { date, count: days[key] ?? 0 };
  });

  const peak = Math.max(...series.map((d) => d.count));
  if (peak === 0) return <p className={styles.empty}>No commits in the last {span} days.</p>;

  // A clean top tick, so the one gridline lands on a round number.
  const step = peak <= 5 ? 1 : peak <= 20 ? 5 : 10;
  const top = Math.ceil(peak / step) * step;
  const width = PAD_LEFT + span * SLOT;
  const plot = H - PAD_TOP - PAD_BOTTOM;
  const y = (n: number) => PAD_TOP + plot - (n / top) * plot;
  const best = series.reduce((a, b) => (b.count > a.count ? b : a));

  return (
    <figure className={styles.figure}>
      <div className={styles.scroll}>
        <svg
          viewBox={`0 0 ${width} ${H}`}
          width={width}
          height={H}
          className={styles.svg}
          role="img"
          aria-label={`Commits a day for the last ${span} days, most was ${best.count} on ${short(best.date)}`}
        >
          <line x1={PAD_LEFT} x2={width} y1={y(top)} y2={y(top)} className={styles.grid} />
          <line x1={PAD_LEFT} x2={width} y1={y(0)} y2={y(0)} className={styles.baseline} />
          <text x={PAD_LEFT - 6} y={y(top) + 3} textAnchor="end" className={styles.axis}>
            {top}
          </text>
          <text x={PAD_LEFT - 6} y={y(0) + 3} textAnchor="end" className={styles.axis}>
            0
          </text>

          {series.map((d, i) => {
            const x = PAD_LEFT + i * SLOT + (SLOT - BAR) / 2;
            const tip = `${d.count === 0 ? "No" : d.count} commit${d.count === 1 ? "" : "s"} on ${short(d.date)}`;
            // The whole slot is the hover target, not just the bar, so
            // short days are easy to hit.
            return (
              <g key={i} className={styles.slot}>
                <rect x={PAD_LEFT + i * SLOT} y={PAD_TOP} width={SLOT} height={plot} className={styles.hit}>
                  <title>{tip}</title>
                </rect>
                {d.count > 0 && <path d={column(x, y(d.count), BAR, y(0) - y(d.count))} className={styles.bar} />}
              </g>
            );
          })}

          <text x={PAD_LEFT + series.indexOf(best) * SLOT + SLOT / 2} y={y(best.count) - 4} textAnchor="middle" className={styles.value}>
            {best.count}
          </text>
          <text x={PAD_LEFT} y={H - 4} className={styles.axis}>
            {short(series[0].date)}
          </text>
          <text x={width} y={H - 4} textAnchor="end" className={styles.axis}>
            Today
          </text>
        </svg>
      </div>
    </figure>
  );
}
