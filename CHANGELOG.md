# Changelog

Everything that changed in each version of ComicK Tools, newest first. The web page shows the same history, grouped by release, on its homepage.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Starters for every system** in `run/`. They check that Python, Node.js and git are installed in versions that work, link to whatever is missing, and start the web page. Windows 11 is the default, with versions for Windows 10 and Windows 7 (which gets a command line menu, since the web page needs Windows 10 or newer), macOS and Linux.
- **Network mode**, off unless you turn it on. Other devices on your network can then open the web page at your computer's address. Switch it on and off under **Network access** in Settings, which shows the address and can restart the page for you.
- **Smooth scrolling** across the page, including Page Up, Page Down, Space, the arrow keys, Home and End.
- **Friendlier docs**: a new README with screenshots, guides to [how it works](docs/architecture.md) and the [design](docs/design.md), a rewritten contributing guide, this changelog, a code of conduct, security and support pages, issue forms for bugs, features and improvements, and a pull request template.

### Changed

- The web page now starts on `localhost` and prints your network address when network mode is on.
- The Privacy Policy and Terms cover network mode.

## [0.2.0] - 2026-11-11

### Added

- **A homepage** with your ComicK account (picture, role, karma and uploads), the tools, a year of activity, the last 30 days and this changelog.
- **The Mass Deleter as numbered steps**, like the Crunchyroll Importer.
- **Terms of Service, Privacy Policy and an open-source package list**, under Legal in the sidebar. The tools ask you to accept the Terms once, on the page or on the command line, and nothing reaches ComicK before that.
- **A Settings page** for the session cookie, speed limits and API address, so `.env` no longer needs a text editor. The first visit offers to fill in the cookie.
- **Start over**, which clears a tool's working files in one click.
- **Run history that survives a restart.**
- **Admin tools locked by role.** The importer says whether your uploads go to review or straight live.
- Full ComicK links work wherever a slug is asked for, including user profile links in the Mass Deleter.
- A logo, a favicon and page titles like "Crunchyroll Importer | ComicK Tools".
- A warning against pasting code into the browser console.

### Changed

- Licensed under the GNU GPL v3.
- Works on phones, with a Menu button, and scales up on large and 4K screens.
- Update checks find releases of a private repository through git.

### Faster and lighter

- The homepage starts one git process per visit instead of about ten.
- Account checks that arrive together share one.
- Loading and progress animations no longer repaint every frame.
- The profile picture loads at the size it's shown, without third-party cookies.

## [0.1.0] - 2026-11-10

The first release.

### Added

- **Crunchyroll Importer**: formats a Crunchyroll season into ComicK episodes (titles in every language, aired dates, durations, season renumbering, preview images) and uploads them, skipping episodes ComicK already has. Review mode adds a note for moderators.
- **Mass Deleter**: deletes chapters or episodes in bulk from a comic, an anime or one user's uploads, narrowed by language, group and number, with a dry run.
- **The web page**: every tool in a menu, a form for its options, a live console you can type into, recent runs, a command menu on `Ctrl K`, and in-app updates.
- **Step by step importing**: paste the response, format, check each episode's type (or edit it in full), then upload.
- Windows 7 support for every tool on the command line.

[Unreleased]: https://github.com/Russhvith/comick-tools/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Russhvith/comick-tools/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Russhvith/comick-tools/releases/tag/v0.1.0
