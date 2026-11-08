import { spawn } from "node:child_process";
import { REPO_ROOT, UI_DIR } from "./paths";
import { createRun, emit, finish, listRuns, type Run } from "./runs";
import { localVersion } from "./version";

// scripts/serve.mjs restarts `next start` when the server exits with this.
export const RESTART_EXIT_CODE = 75;

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

/**
 * npm on Windows is a .cmd shim, which Node refuses to spawn without a
 * shell. When the server was started through npm we know where npm's own
 * JS entry point is and can run it with node directly instead.
 */
function npmCommand(args: string[]): [string, string[], boolean] {
  const execPath = process.env.npm_execpath;
  if (execPath && execPath.endsWith(".js")) return [process.execPath, [execPath, ...args], false];
  return ["npm", args, process.platform === "win32"];
}

function step(run: Run, label: string, cmd: string, args: string[], cwd = REPO_ROOT, shell = false) {
  emit(run, `\r\n${BOLD}$ ${label}${RESET}\r\n`);
  return new Promise<{ code: number | null; output: string }>((resolve) => {
    let output = "";
    // Only fixed arguments ever reach this, never anything from a request,
    // so the shell fallback for npm on Windows has nothing to inject.
    const child = spawn(cmd, args, { cwd, shell, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
    const take = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      output += text;
      emit(run, text.replace(/\r?\n/g, "\r\n"));
    };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    child.on("error", (error) => {
      emit(run, `${RED}${error.message}${RESET}\r\n`);
      resolve({ code: null, output });
    });
    child.on("close", (code) => resolve({ code, output }));
  });
}

function fail(run: Run, message: string) {
  emit(run, `\r\n${RED}${BOLD}Update stopped:${RESET} ${message}\r\n`);
  finish(run, "failed", 1);
}

let updating = false;

export function updateRunning() {
  return updating;
}

/**
 * Pull the latest code and restart onto it.
 *
 * Fast forward only, and only from a clean checkout, so the update never
 * merges or overwrites anything someone changed by hand. Data files and
 * .env are gitignored and don't count as changes.
 */
export function startUpdate(): Run {
  const run = createRun("update", "Update comick-tools");
  updating = true;
  (async () => {
    try {
      const busy = listRuns().filter((r) => r.kind === "script" && r.status === "running");
      if (busy.length) {
        return fail(run, `${busy.length} script run still going. Let it finish or stop it, then update.`);
      }
      const before = localVersion();
      emit(run, `${DIM}Current version ${before}${RESET}\r\n`);

      const status = await step(run, "git status --porcelain", "git", ["status", "--porcelain"]);
      if (status.code !== 0) return fail(run, "git isn't available or this isn't a git checkout.");
      if (status.output.trim()) {
        return fail(run, "there are local changes (listed above). Commit or stash them, then update again.");
      }
      const branch = (await step(run, "git rev-parse --abbrev-ref HEAD", "git", ["rev-parse", "--abbrev-ref", "HEAD"])).output.trim();
      if (!branch || branch === "HEAD") return fail(run, "the checkout isn't on a branch, can't pull.");
      const oldHead = (await step(run, "git rev-parse HEAD", "git", ["rev-parse", "HEAD"])).output.trim();

      if ((await step(run, "git fetch --tags origin", "git", ["fetch", "--tags", "origin"])).code !== 0) {
        return fail(run, "couldn't fetch from origin. Check the network and that the origin remote exists.");
      }
      if ((await step(run, `git pull --ff-only origin ${branch}`, "git", ["pull", "--ff-only", "origin", branch])).code !== 0) {
        return fail(run, "the branch has moved in a way a fast forward can't follow. Sort it out with git, then update again.");
      }
      const newHead = (await step(run, "git rev-parse HEAD", "git", ["rev-parse", "HEAD"])).output.trim();
      if (newHead === oldHead) {
        emit(run, `\r\n${GREEN}Already up to date.${RESET}\r\n`);
        return finish(run, "done", 0);
      }

      const changed = (await step(run, "git diff --name-only", "git", ["diff", "--name-only", oldHead, newHead])).output;
      if (/^ui\/package(-lock)?\.json$/m.test(changed)) {
        const [cmd, args, shell] = npmCommand(["ci"]);
        if ((await step(run, "npm ci", cmd, args, UI_DIR, shell)).code !== 0) return fail(run, "installing UI dependencies failed.");
      }

      const supervised = process.env.COMICK_TOOLS_SUPERVISED === "1";
      if (!supervised) {
        emit(run, `\r\n${GREEN}Updated to ${localVersion()}.${RESET} ${YELLOW}This is the dev server, which picks up most changes by itself. Restart it if anything looks off.${RESET}\r\n`);
        return finish(run, "done", 0);
      }

      const [cmd, args, shell] = npmCommand(["run", "build"]);
      if ((await step(run, "npm run build", cmd, args, UI_DIR, shell)).code !== 0) {
        return fail(run, "the UI build failed. The code is updated, so fix the build and restart the server by hand.");
      }
      emit(run, `\r\n${GREEN}${BOLD}Updated ${before} to ${localVersion()}. Restarting the server...${RESET}\r\n`);
      finish(run, "done", 0);
      // Give the browser a moment to receive the last lines before the
      // process goes away. serve.mjs starts it again on the new build.
      setTimeout(() => process.exit(RESTART_EXIT_CODE), 1200);
    } catch (error) {
      fail(run, (error as Error).message);
    } finally {
      updating = false;
    }
  })();
  return run;
}
