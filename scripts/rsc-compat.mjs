#!/usr/bin/env node
// Adapt reviewed RSC output to the native Codex project discovery format.
import { log } from 'node:console';
import { existsSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, '.rsc.json'), 'utf8'));
if (!new Set(['3.0.10', '3.6.0']).has(manifest.catalogVersion)) throw new Error('Review compatibility before changing RSC version');
for (const id of manifest.skills) {
  const destination = join(root, '.agents/skills', id);
  if (!existsSync(join(root, '.rsc/skills', id, 'SKILL.md'))) throw new Error(`Missing skill: ${id}`);
  if (!existsSync(destination)) symlinkSync(`../../.rsc/skills/${id}`, destination);
}
for (const name of readdirSync(join(root, '.codex/agents'))) {
  if (!name.endsWith('.toml')) continue;
  const path = join(root, '.codex/agents', name);
  const text = readFileSync(path, 'utf8');
  // Codex agent definitions do not accept the generated tools array.
  const compatible = text.replace(/^tools = \[.*\]\r?\n/gm, '');
  if (compatible !== text) writeFileSync(path, compatible);
}
const hookPath = join(root, '.codex/hooks.json');
const hooks = JSON.parse(readFileSync(hookPath, 'utf8'));
for (const group of hooks.hooks.PostToolUse || []) {
  // Native Codex shell tools use exec_command/write_stdin rather than Bash.
  if (group.matcher === 'Bash') group.matcher = 'Bash|exec_command|write_stdin';
}
for (const event of ['PreCompact', 'SessionEnd', 'Stop']) {
  for (const group of hooks.hooks[event] || []) {
    for (const hook of group.hooks) delete hook.additionalContextLimit;
  }
}
writeFileSync(hookPath, JSON.stringify(hooks, null, 2) + '\n');
log(`Codex compatibility applied: ${manifest.skills.length} RSC skills`);
