// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

export const site = {
  name: "ComicK Tools",
  /** The wordmark in the header, with the accent part in the link blue. */
  wordmark: { lead: "ComicK", accent: "Tools" },
  tagline: "Bulk tools for ComicK",
  description: "Upload, tidy up and manage things on ComicK from your browser.",
  author: { name: "Russhvith", url: "https://github.com/Russhvith" },
  repoUrl: "https://github.com/Russhvith/comick-tools",
  docsUrl: "https://github.com/Russhvith/comick-tools#readme",
  comickUrl: "https://comick.dev",
};

/** "Crunchyroll Importer | ComicK Tools", or just the site name. */
export function pageTitle(section?: string | null) {
  return section ? `${section} | ${site.name}` : site.name;
}

/** How often the runs list refreshes while a run is going. Idle means never. */
export const polling = {
  runsWhileRunning: 3000,
};
