import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import process from "node:process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const distDir = path.join(repoRoot, "dist");
const worktreeDir = "/private/tmp/habhob-gh-pages";
const packageJson = JSON.parse(
  execFileSync("node", ["-p", "JSON.stringify(require('./package.json'))"], {
    cwd: repoRoot,
    encoding: "utf8",
  }),
);

function run(command, args, cwd = repoRoot) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
  });
}

function capture(command, args, cwd = repoRoot) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
  }).trim();
}

if (!existsSync(distDir)) {
  throw new Error("dist/ not found. Run the build before publishing GitHub Pages.");
}

const worktrees = capture("git", ["worktree", "list", "--porcelain"]);
const hasTargetWorktree = worktrees.includes(`worktree ${worktreeDir}`);

if (!hasTargetWorktree && existsSync(worktreeDir)) {
  rmSync(worktreeDir, { recursive: true, force: true });
}

if (!hasTargetWorktree) {
  run("git", ["worktree", "add", "--force", worktreeDir, "gh-pages"]);
}

run(
  "rsync",
  [
    "-a",
    "--checksum",
    "--delete",
    "--exclude",
    ".git",
    `${distDir}/`,
    `${worktreeDir}/`,
  ],
  repoRoot,
);

const pagesServerDir = path.join(worktreeDir, "server");
if (existsSync(pagesServerDir)) {
  rmSync(pagesServerDir, { recursive: true, force: true });
}

const status = capture("git", ["status", "--short"], worktreeDir);
if (!status) {
  console.log("gh-pages is already up to date.");
  process.exit(0);
}

run("git", ["add", "-A"], worktreeDir);
run("git", ["commit", "-m", `Deploy v${packageJson.version}`], worktreeDir);
run("git", ["push", "origin", "gh-pages"], worktreeDir);
