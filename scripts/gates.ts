#!/usr/bin/env bun

type Gate = {
  name: string;
  cmd: [string, ...string[]];
  description?: string;
};

const gates: Gate[] = [
  {
    name: 'Lint',
    cmd: ['pnpm', 'lint'],
    description: 'Checks formatting issues and common mistakes across every workspace package.',
  },
  {
    name: 'Typecheck',
    cmd: ['pnpm', 'typecheck'],
    description: 'Ensures TypeScript types are sound before building.',
  },
  {
    name: 'Unit tests',
    cmd: ['pnpm', 'test'],
    description: 'Runs Vitest suites and any other package level unit tests.',
  },
];

async function runGate(gate: Gate) {
  console.log(`\n🔒  ${gate.name}`);
  if (gate.description) {
    console.log(`    ${gate.description}`);
  }

  const task = Bun.spawn({
    cmd: gate.cmd,
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const exitCode = await task.exited;
  if (exitCode !== 0) {
    throw new Error(`Gate "${gate.name}" failed with exit code ${exitCode}.`);
  }
}

async function main() {
  const started = performance.now();

  try {
    for (const gate of gates) {
      await runGate(gate);
    }
  } catch (error) {
    console.error('\n❌  Gatekeeper stopped the release.');
    if (error instanceof Error) {
      console.error(`    ${error.message}`);
    }
    Bun.exit(1);
  }

  const total = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`\n✅  All gates cleared in ${total}s.`);
}

await main();
