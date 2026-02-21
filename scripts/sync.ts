#!/usr/bin/env bun
import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { parseBackupData } from "../services/backupService";

interface Args {
  repo: string;
  file?: string;
  url?: string;
  dryRun: boolean;
  noReadme: boolean;
  port: number;
  timeout: number;
}

const DEFAULT_REPO = "omid3098/quran_notes";
const TARGET_FILE = "quran_notes_backup.json";
const SITE_URL = "https://www.omid-saadat.com/quran_reader/";
const DEFAULT_PORT = 3456;
const DEFAULT_TIMEOUT_SEC = 30;

const parseArgs = (): Args => {
  const argv = process.argv.slice(2);
  const args: Args = {
    repo: DEFAULT_REPO,
    dryRun: false,
    noReadme: false,
    port: DEFAULT_PORT,
    timeout: DEFAULT_TIMEOUT_SEC,
  };

  argv.forEach((arg, index) => {
    if (arg === "--dry-run") args.dryRun = true;
    if (arg === "--no-readme") args.noReadme = true;
    if (arg === "--repo" && argv[index + 1]) args.repo = argv[index + 1];
    if (arg === "--file" && argv[index + 1]) args.file = argv[index + 1];
    if (arg === "--url" && argv[index + 1]) args.url = argv[index + 1];
    if (arg === "--port" && argv[index + 1]) args.port = Number(argv[index + 1]);
    if (arg === "--timeout" && argv[index + 1]) args.timeout = Number(argv[index + 1]);
  });

  return args;
};

// --- Git helpers ---

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

const pushToGitHub = (rawBackup: string, args: Args) => {
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
    if (repoPath && !args.dryRun) {
      rmSync(repoPath, { recursive: true, force: true });
    }
  }
};

// --- Local bridge: receive backup from browser ---

const setCorsHeaders = (res: ServerResponse, origin: string | undefined) => {
  // Allow the origin that sent the request (production site or localhost dev server)
  const allowed = origin ?? "*";
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

const waitForBackupFromBrowser = (port: number, timeoutSec: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      setCorsHeaders(res, req.headers.origin);

      // CORS preflight
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === "POST" && req.url === "/backup") {
        const body = await readBody(req);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        clearTimeout(timer);
        server.close();
        resolve(body);
        return;
      }

      res.writeHead(404);
      res.end("Not found");
    });

    server.listen(port, () => {
      console.warn(`Sync bridge listening on http://localhost:${port}`);
    });

    const timer = setTimeout(() => {
      server.close();
      reject(new Error(`Timed out after ${timeoutSec}s waiting for backup data from browser.`));
    }, timeoutSec * 1000);
  });
};

const openBrowser = (url: string) => {
  const platform = os.platform();
  try {
    if (platform === "win32") {
      execSync(`start "" "${url}"`, { stdio: "ignore" });
    } else if (platform === "darwin") {
      execSync(`open "${url}"`, { stdio: "ignore" });
    } else {
      execSync(`xdg-open "${url}"`, { stdio: "ignore" });
    }
  } catch {
    console.warn(`Could not open browser automatically. Please open: ${url}`);
  }
};

// --- Main ---

const main = async () => {
  const args = parseArgs();

  let rawBackup: string;

  if (args.file) {
    // Manual file mode: read from provided file path
    console.warn(`Using backup file: ${args.file}`);
    rawBackup = readFileSync(args.file, "utf8");
    const parsed = JSON.parse(rawBackup);
    parseBackupData(parsed); // validate — throws on invalid data
  } else {
    // Bridge mode: open browser and wait for data
    console.warn("Starting sync bridge...");
    const baseUrl = args.url || SITE_URL;
    const syncUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}sync=${args.port}`;
    console.warn(`Opening browser: ${syncUrl}`);
    openBrowser(syncUrl);
    console.warn(`Waiting for backup data (timeout: ${args.timeout}s)...`);

    rawBackup = await waitForBackupFromBrowser(args.port, args.timeout);

    // Validate received data
    const parsed = JSON.parse(rawBackup);
    const data = parseBackupData(parsed);
    const noteCount = Object.keys(data.notes).length;
    const surahNoteCount = Object.keys(data.surahNotes).length;
    console.warn(`Received backup: ${noteCount} notes, ${surahNoteCount} surah notes`);
  }

  // Push to GitHub
  console.warn(`Pushing to ${args.repo}...`);
  pushToGitHub(rawBackup, args);
};

try {
  await main();
} catch (error) {
  console.error("Sync failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
