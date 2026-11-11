# Security

ComicK Tools handles your ComicK session cookie and can delete things on ComicK, so security problems matter a lot. Thank you for reporting them responsibly.

## Report it privately

**Please don't open a public issue for a security problem.** Anyone can read issues, and that would show everyone how to misuse it before it's fixed.

Instead, use one of these:

| How | Where |
| --- | --- |
| Email | **me@russhvithdesign.in** |
| Discord | **@russhvith** (send a direct message asking for a private chat) |
| GitHub | The **Report a vulnerability** button under this repository's **Security** tab, if it's switched on |

### What to include

- What the problem is, and what someone could do with it.
- The steps to make it happen, on which version and which system.
- Whether you've seen it used against anyone.

> [!WARNING]
> Never send your real session cookie or `.env` file, even in a private report. If you need to show one, replace the value with `xxxxx`.

## What happens next

1. You'll hear back within a few days to say the report arrived.
2. We work out how serious it is and fix it, keeping you updated.
3. A fixed version is released, and the changelog mentions the fix.
4. Once people have had a chance to update, you're welcome to talk about it. We're happy to credit you, or to keep you anonymous.

This is a project run in spare time, so there's no bug bounty, but every report is taken seriously.

## Supported versions

Only the newest release gets security fixes. The web page tells you when a new one is out and can update itself.

| Version | Supported |
| --- | --- |
| 1.0.x | Yes |
| Older | No, please update |

## What counts

**In scope**: problems in this repository, such as:

- A web page or another device getting into the local server when it shouldn't.
- The cookie leaking anywhere other than ComicK's API.
- Reading or changing files outside what a tool declares.
- Making a tool run something it shouldn't.

**Not in scope**:

- **Network mode doing what it says.** With it on, anyone on your network can use the page. That's documented and shown as a warning.
- **Someone who already controls your computer** reading your `.env` file.
- **Problems in ComicK itself.** Please report those to ComicK.
- **Problems in Python, Node.js or a package**, unless the way we use it makes it worse. Report those to their makers.

## Keeping yourself safe

- Keep your `.env` file private. It holds your cookie.
- Only turn on network mode on a network where you trust everyone.
- If you think your cookie leaked, sign out of ComicK in your browser, which ends that session, and save a fresh one in Settings.
- Never paste code into the browser console because someone told you to.
