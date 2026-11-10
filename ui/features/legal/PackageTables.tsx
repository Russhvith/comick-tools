// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { PackageRow, Packages } from "@/lib/server/legal";
import styles from "./PackageTables.module.css";

function Table({ caption, rows }: { caption: string; rows: PackageRow[] }) {
  return (
    <table className={styles.table}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Package</th>
          <th scope="col">Version</th>
          <th scope="col">Licence</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}>
            <td>
              <a href={`https://www.npmjs.com/package/${r.name}`} target="_blank" rel="noreferrer">
                {r.name}
              </a>
            </td>
            <td className={styles.mono}>{r.version}</td>
            <td>{r.license}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** What's installed right now, read through legal/packages.py on every load. */
export function PackageTables({ data }: { data: Packages | null }) {
  if (!data) {
    return <p className={styles.note}>Couldn&apos;t read the package list. Run python legal/packages.py to see it in the console.</p>;
  }
  return (
    <div className={styles.wrap}>
      <p className={styles.note}>
        This list is read from the requirements files and <code>ui/package-lock.json</code> each time the page loads, so it always matches
        what is installed. <code>legal/packages.txt</code> holds a copy, refreshed with <code>python legal/packages.py --write</code>.
      </p>

      <section className={styles.group}>
        <h2 className={styles.heading}>Python tools</h2>
        <ul className={styles.list}>
          <li>
            Python {data.python.minimum} or newer <span className={styles.license}>PSF-2.0</span>
          </li>
          {data.python.packages.length === 0 ? (
            <li>Standard library only, no other packages</li>
          ) : (
            data.python.packages.map((p) => (
              <li key={p.spec}>
                <code>{p.spec}</code>, used by {p.usedBy.join(", ")}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className={styles.group}>
        <h2 className={styles.heading}>Web interface</h2>
        <Table caption="Used when it runs" rows={data.ui.runtime} />
        <Table caption="Used to build it" rows={data.ui.build} />
        <p className={styles.note}>
          These depend on {data.ui.indirect} further packages, listed with their exact versions and licences in <code>ui/package-lock.json</code>.
        </p>
      </section>

      <p className={styles.note}>Each package is licensed under its own terms. Nothing in our Terms of Service limits your rights under those licences.</p>
    </div>
  );
}
