#!/usr/bin/env bun
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseBackupData } from "../services/backupService";

interface Args {
  repo: string;
  file?: string;
  dryRun: boolean;
  noReadme: boolean;
}

const DEFAULT_REPO = "omid3098/quran_notes";
const TARGET_FILE = "quran_notes_backup.json";

const parseArgs = (): Args => {
  const argv = process.argv.slice(2);
  const args: Args = {
    repo: DEFAULT_REPO,
    dryRun: false,
    noReadme: false,
  };

  argv.forEach((arg, index) => {
    if (arg === "--dry-run") args.dryRun = true;
    if (arg === "--no-readme") args.noReadme = true;
    if (arg === "--repo" && argv[index + 1]) args.repo = argv[index + 1];
    if (arg === "--file" && argv[index + 1]) args.file = argv[index + 1];
  });

  return args;
};

const findLatestDownload = (): string | undefined => {
  const downloadsDir = path.join(os.homedir(), "Downloads");
  try {
    const files = readdirSync(downloadsDir)
      .filter((name) => name.startsWith("quran_notes_backup_") && name.endsWith(".json"))
      .map((name) => ({
        name,
        time: statSync(path.join(downloadsDir, name)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) return undefined;
    return path.join(downloadsDir, files[0].name);
  } catch {
    return undefined;
  }
};

const validateBackupFile = (filePath: string): string => {
  const raw = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  parseBackupData(parsed); // throws on invalid data
  return raw;
};

const cloneRepo = (repo: string) => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "quran-notes-"));
  const remote = `git@github.com:${repo}.git`;
  execFileSync("git", ["clone", "--branch", "main", remote, tmp], { stdio: "inherit" });
  return tmp;
};

const updateReadmeStamp = (repoPath: string, timestamp: string) => {
  const readmePath = path.join(repoPath, "README.md");
  if (!existsSync(readmePath)) return false;

  const content = readFileSync(readmePath, "utf8");
  const stamp = `Last updated: ${timestamp}`;
  const next = content.includes("Last updated:")
    ? content.replace(/Last updated:.*$/m, stamp)
    : `${content.trim()}\n\n${stamp}\n`;
  if (next === content) return false;
  writeFileSync(readmePath, next, "utf8");
  return true;
};

const main = () => {
  const args = parseArgs();
  const sourceFile = args.file || findLatestDownload();
  if (!sourceFile) {
    throw new Error(
      "No backup file found. Provide one with --file or export a backup to ~/Downloads first."
    );
  }

  console.warn(`Using backup file: ${sourceFile}`);
  const rawBackup = validateBackupFile(sourceFile);
  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, "Z");

  let repoPath = "";
  try {
    repoPath = cloneRepo(args.repo);
    const targetPath = path.join(repoPath, TARGET_FILE);
    writeFileSync(targetPath, rawBackup, "utf8");

    const touchedReadme = args.noReadme ? false : updateReadmeStamp(repoPath, timestamp);

    execFileSync("git", ["-C", repoPath, "add", TARGET_FILE], { stdio: "inherit" });
    if (touchedReadme) {
      execFileSync("git", ["-C", repoPath, "add", "README.md"], { stdio: "inherit" });
    }

    const commitMessage = `Update notes backup (${timestamp})`;
    if (args.dryRun) {
      console.warn("[dry-run] Skipping commit and push. Files prepared in:", repoPath);
      return;
    }

    execFileSync("git", ["-C", repoPath, "commit", "-m", commitMessage], { stdio: "inherit" });
    execFileSync("git", ["-C", repoPath, "push", "origin", "main"], { stdio: "inherit" });
    console.warn("Backup synced successfully.");
  } finally {
    if (repoPath) {
      rmSync(repoPath, { recursive: true, force: true });
    }
  }
};

try {
  main();
} catch (error) {
  console.error("Sync failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
