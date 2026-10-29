#!/usr/bin/env node
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { constants, unlinkSync } from 'node:fs';
import { lstat, readdir, readFile, mkdir, open, rename, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, extname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const configPath = '02-DOCS/second-brain.json';
const statePath = '02-DOCS/wiki/.sources.json';
const markdownPath = '02-DOCS/wiki/sources.md';
const documents = new Set('.md .mdx .rst .txt .pdf .doc .docx .xls .xlsx .csv .tsv .html .htm .rtf'.split(' '));
const images = new Set('.png .jpg .jpeg .gif .webp .svg .tif .tiff'.split(' '));
const directories = new Set(['node_modules', '01-TOOLS', 'dist', 'build', 'coverage', 'vendor', '__pycache__', 'target']);
const generated = new Set([configPath, statePath, markdownPath, '02-DOCS/wiki/scores.json', '02-DOCS/wiki/dashboard.html']);
const archived = ['02-DOCS/raw', '02-DOCS/inbox/_processed', '02-DOCS/audits'];
const args = process.argv.slice(2);
let root = process.cwd();
let check = false;
let watch = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root' && args[i + 1]) root = resolve(args[++i]);
  else if (args[i] === '--check') check = true;
  else if (args[i] === '--watch') watch = true;
  else throw new Error(`Unknown argument: ${args[i]}`);
}
const below = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);
const documentDirectory = (path) => path.split('/').slice(0, -1).some((part) => /^(docs?|documentation|02-DOCS)$/i.test(part));
const safePath = (path) => typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.split('/').some((p) => !p || p === '.' || p === '..');
const sensitive = (path) => path.toLowerCase() === 'docs/datos.md' || /(^|[._ -])(secrets?|credentials?|passwords?|tokens?|private[-_ ]?key)([._ -]|$)/i.test(path.split('/').at(-1));
const order = (a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function readOptional(path) {
  for (const directory of ['02-DOCS', '02-DOCS/wiki']) {
    if (!below(path, directory)) continue;
    try {
      if (!(await lstat(join(root, directory))).isDirectory()) throw new Error(`Unsafe directory: ${directory}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  try {
    if (!(await lstat(join(root, path))).isFile()) throw new Error(`Not a regular file: ${path}`);
    return await readFile(join(root, path), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
async function config() {
  const value = JSON.parse(await readOptional(configPath));
  if (value?.version !== 1 || !Number.isSafeInteger(value.maxFileBytes) || value.maxFileBytes < 1 ||
      value.maxFileBytes > 100 * 1024 * 1024 || !Number.isSafeInteger(value.intervalMs) ||
      value.intervalMs < 100 || !Array.isArray(value.excludePaths) || !value.excludePaths.every(safePath)) {
    throw new Error(`Invalid configuration: ${configPath}`);
  }
  return value;
}
async function validateState() {
  const text = await readOptional(statePath);
  if (text === null) return;
  try {
    const value = JSON.parse(text);
    if (value?.version !== 1 || !Array.isArray(value.sources) || !Array.isArray(value.excluded) ||
        !value.sources.every((s) => safePath(s.path) && /^[a-f0-9]{64}$/.test(s.hash) &&
          Number.isSafeInteger(s.size) && s.size >= 0 && typeof s.format === 'string' &&
          typeof s.topic === 'string' && s.status === 'indexed') ||
        !value.excluded.every((s) => safePath(s.path) && typeof s.reason === 'string')) throw new Error('invalid schema');
  } catch (error) { throw new Error(`Invalid state ${statePath}: ${error.message}`); }
}
async function digest(path, maxFileBytes) {
  const handle = await open(join(root, path), constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > maxFileBytes) return null;
    const hash = createHash('sha256');
    const buffer = Buffer.alloc(65536);
    let size = 0;
    while (true) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      size += bytesRead;
      if (size > maxFileBytes) return null;
      hash.update(buffer.subarray(0, bytesRead));
    }
    return { hash: hash.digest('hex'), size };
  } finally { await handle.close(); }
}
async function scan(settings) {
  const sources = [];
  const excluded = [];
  async function walk(directory = '') {
    for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      if (entry.name.startsWith('.') || generated.has(path)) continue;
      let reason = null;
      if (entry.isSymbolicLink()) reason = 'symlink';
      else if (sensitive(path)) reason = 'sensitive';
      else if (settings.excludePaths.some((prefix) => below(path, prefix))) reason = 'configured';
      else if (archived.some((prefix) => below(path, prefix))) reason = 'archive-or-generated';
      else if (entry.isDirectory() && directories.has(entry.name)) reason = 'tooling-or-build';
      if (reason) { excluded.push({ path, reason }); continue; }
      if (entry.isDirectory()) { await walk(path); continue; }
      if (!entry.isFile()) continue;
      const extension = extname(entry.name).toLowerCase();
      if (!documents.has(extension) && !(documentDirectory(path) && (extension === '.json' || images.has(extension)))) continue;
      const data = await digest(path, settings.maxFileBytes);
      if (!data) { excluded.push({ path, reason: 'size-limit' }); continue; }
      sources.push({ path, ...data, format: extension.slice(1), topic: dirname(path) === '.' ? 'raíz' : dirname(path), status: 'indexed' });
    }
  }
  await walk();
  return { version: 1, sources: sources.sort(order), excluded: excluded.sort(order) };
}
const escapeLabel = (value) => value.replace(/[\\`*_[\]<>|]/g, '\\$&').replace(/[\r\n]/g, ' ');
const url = (path) => path.split('/').map((part) => encodeURIComponent(part).replace(/[!'()*]/g,
  (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)).join('/');
function markdown(state) {
  const lines = ['# Índice automático de fuentes', '',
    'Inventario de rutas y huellas SHA-256. No acredita lectura, síntesis ni vigencia del contenido.',
    'Generado por `node scripts/second-brain.mjs`; no editar a mano.',
    `Fuentes indexadas: ${state.sources.length}. Exclusiones explícitas: ${state.excluded.length}.`,
    'Los archivos eliminados desaparecen del inventario en la siguiente sincronización.', '',
    'Guía: [alcance y automatización](harness/second-brain.md).', ''];
  let topic;
  for (const source of [...state.sources].sort((a, b) => a.topic < b.topic ? -1 : a.topic > b.topic ? 1 : order(a, b))) {
    if (source.topic !== topic) { topic = source.topic; lines.push(`## ${escapeLabel(topic)}`, ''); }
    lines.push(`- [${escapeLabel(source.path)}](../../${url(source.path)}) — ${source.format}, ${source.size} bytes.`);
  }
  lines.push('', '## Exclusiones', '',
    'No se lee el contenido de rutas sensibles, enlaces simbólicos ni árboles excluidos.',
    'Los directorios ocultos también se omiten. Detalle de límites: [configuración](../second-brain.json).', '');
  for (const excluded of state.excluded) lines.push(`- ${escapeLabel(excluded.path)}: ${excluded.reason}.`);
  return `${lines.join('\n')}\n`;
}
async function prepareOutputs() {
  for (const path of ['02-DOCS', '02-DOCS/wiki']) {
    await mkdir(join(root, path), { recursive: true });
    if (!(await lstat(join(root, path))).isDirectory()) throw new Error(`Unsafe output directory: ${path}`);
  }
}
async function atomicWrite(path, text) {
  const temporary = join(root, `${path}.${randomUUID()}.tmp`);
  const handle = await open(temporary, 'wx', 0o600);
  try { await handle.writeFile(text); await handle.sync(); } finally { await handle.close(); }
  try { await rename(temporary, join(root, path)); }
  finally { await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error; }); }
}
async function writeInventory(settings) {
  await validateState();
  const state = await scan(settings);
  const outputs = [[statePath, json(state)], [markdownPath, markdown(state)]];
  const changed = [];
  for (const [path, text] of outputs) if (await readOptional(path) !== text) changed.push([path, text]);
  if (!check && changed.length) {
    await prepareOutputs();
    for (const [path, text] of changed) await atomicWrite(path, text);
  }
  if (!watch || changed.length) process.stdout.write(`${check && changed.length ? 'STALE' : 'OK'}: ${state.sources.length} sources, ${state.excluded.length} exclusions; ${changed.length} outputs ${check ? 'stale' : 'updated'}\n`);
  return changed.length > 0;
}
const lockPath = join(root, '.second-brain.lock');
let locked = false;
process.once('exit', () => { if (locked) { try { unlinkSync(lockPath); } catch { /* Preserve the original exit status. */ } } });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => process.exit(0));
async function synchronize(settings) {
  let lock;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { lock = await open(lockPath, 'wx', 0o600); break; }
    catch (error) { if (error.code !== 'EEXIST') throw error; await delay(50); }
  }
  if (!lock) throw new Error(`Index busy: ${lockPath}; check its PID before recovering a stale lock`);
  locked = true;
  try {
    await lock.writeFile(`${process.pid}\n`);
    return await writeInventory(settings);
  } finally {
    await lock.close();
    await unlink(lockPath);
    locked = false;
  }
}
async function main() {
  if (check && watch) throw new Error('--check and --watch are mutually exclusive');
  let settings = await config();
  const changed = await synchronize(settings);
  if (check && changed) process.exitCode = 1;
  while (watch) {
    await delay(settings.intervalMs);
    try { settings = await config(); await synchronize(settings); }
    catch (error) { process.stderr.write(`second-brain: ${error.message}\n`); }
  }
}
main().catch((error) => { process.stderr.write(`second-brain: ${error.message}\n`); process.exitCode = 2; });
