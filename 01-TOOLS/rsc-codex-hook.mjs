#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const events = new Set(['start', 'request', 'edit', 'boundary', 'turn', 'compact', 'end']);
let native;
try {
  native = JSON.parse(readFileSync(0, 'utf8'));
  const cwd = realpathSync(native.cwd);
  if (cwd !== root && !cwd.startsWith(root + sep)) process.exit(0);
  const gitRoot = execFileSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  if (realpathSync(gitRoot) !== root) process.exit(0);
} catch {
  process.exit(0);
}
if (!events.has(process.argv[2])) process.exit(1);
const { handleLifecycle } = await import('../.rsc/session-memory-adapter.mjs');
const result = handleLifecycle({ target: 'codex', event: process.argv[2], native, cwd: root });
if (result.degraded) {
  process.stderr.write(`RSC memory failed: ${result.error}\n`);
  process.exit(1);
}
process.stdout.write(JSON.stringify(result.output) + '\n');
