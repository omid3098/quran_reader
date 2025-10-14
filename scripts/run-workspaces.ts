#!/usr/bin/env bun

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type WorkspacePackage = {
  name: string;
  dir: string;
};

async function loadJson(filePath: string) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content) as Record<string, unknown>;
}

async function discoverWorkspaces(rootDir: string): Promise<WorkspacePackage[]> {
  const rootPkgPath = path.join(rootDir, 'package.json');
  const rootPkg = await loadJson(rootPkgPath);
  const patterns = Array.isArray(rootPkg.workspaces) ? (rootPkg.workspaces as string[]) : [];

  const seen = new Map<string, WorkspacePackage>();

  for (const pattern of patterns) {
    const glob = new Bun.Glob(path.join(pattern, 'package.json'));
    for await (const match of glob.scan({ cwd: rootDir })) {
      const pkgPath = path.join(rootDir, match);
      const dir = path.dirname(pkgPath);
      if (seen.has(dir)) {
        continue;
      }

      const pkg = await loadJson(pkgPath);
      const name = typeof pkg.name === 'string' ? pkg.name : dir;
      seen.set(dir, { name, dir });
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
  const scriptName = process.argv[2];
  if (!scriptName) {
    console.error('Usage: run-workspaces <script-name>');
    process.exitCode = 1;
    return;
  }

  const rootDir = path.resolve(import.meta.dir, '..');
  const workspaces = await discoverWorkspaces(rootDir);
  const toRun = [] as WorkspacePackage[];

  for (const workspace of workspaces) {
    const pkgJson = await loadJson(path.join(workspace.dir, 'package.json'));
    const scripts = (pkgJson.scripts ?? {}) as Record<string, unknown>;
    if (typeof scripts[scriptName] === 'string') {
      toRun.push(workspace);
    }
  }

  if (toRun.length === 0) {
    return;
  }

  for (const workspace of toRun) {
    console.log(`\n→ ${workspace.name} — ${scriptName}`);
    const proc = Bun.spawn({
      cmd: ['bun', 'run', scriptName],
      cwd: workspace.dir,
      stdout: 'inherit',
      stderr: 'inherit',
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error(`${workspace.name} ${scriptName} failed with exit code ${exitCode}`);
    }
  }
}

await main();
