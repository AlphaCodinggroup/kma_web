import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
const script = resolve('scripts/second-brain.mjs');
const config = { version: 1, maxFileBytes: 1024, intervalMs: 100, excludePaths: ['docs/DATOS.md'] };
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'second-brain-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, '02-DOCS'), { recursive: true });
  await writeFile(join(root, '02-DOCS/second-brain.json'), JSON.stringify(config));
  return root;
}
async function put(root, path, text = '# Documentation') {
  await mkdir(join(root, path, '..'), { recursive: true });
  await writeFile(join(root, path), text);
}
function run(root, ...args) { return spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' }); }
async function state(root) { return JSON.parse(await readFile(join(root, '02-DOCS/wiki/.sources.json'), 'utf8')); }

test('add, modify, remove, and check preserve the originals and native ledger', async (t) => {
  const root = await fixture(t);
  await put(root, 'packages/core/README.md', '# First');
  await put(root, '02-DOCS/wiki/.ingested.json', '{"native":true}');
  assert.equal(run(root, '--check').status, 1);
  assert.equal(run(root).status, 0);
  const first = (await state(root)).sources[0];
  assert.equal(first.path, 'packages/core/README.md');
  assert.equal(first.status, 'indexed');
  assert.match(first.hash, /^[a-f0-9]{64}$/);
  await put(root, 'packages/core/README.md', '# Changed');
  assert.equal(run(root, '--check').status, 1);
  assert.equal(run(root).status, 0);
  assert.notEqual((await state(root)).sources[0].hash, first.hash);
  assert.equal(await readFile(join(root, first.path), 'utf8'), '# Changed');
  await unlink(join(root, first.path));
  assert.equal(run(root).status, 0);
  assert.deepEqual((await state(root)).sources, []);
  assert.equal(await readFile(join(root, '02-DOCS/wiki/.ingested.json'), 'utf8'), '{"native":true}');
});

test('exclusions, documentation formats, URL escaping, and stable writes', async (t) => {
  const root = await fixture(t);
  const included = ['README.md', 'docs/a [b](c)# %.md', 'docs/data.json', 'docs/table.xlsx',
    "docs/kitchens_&_kitchenettes (3)'s.xlsx", 'docs/control#?%<>\r\n.md',
    'docs/image.png', 'docs/manual.pdf', '02-DOCS/wiki/project/existing.md', 'nested/note.rst'];
  for (const path of included) await put(root, path);
  for (const path of ['node_modules/pkg/README.md', '.claude/README.md', '.worktrees/README.md',
    '01-TOOLS/README.md', 'coverage/README.md', 'build/README.md', 'app/data.json',
    'docs/credentials.md', 'docs/DATOS.md', '02-DOCS/raw/topic/copy.md']) await put(root, path, 'DO NOT COPY');
  await put(root, 'docs/large.txt', 'x'.repeat(1025));
  await symlink(join(root, 'README.md'), join(root, 'docs/link.md'));
  await symlink(join(root, 'docs'), join(root, 'linked-docs'));
  assert.equal(run(root).status, 0);
  const result = await state(root);
  assert.deepEqual(result.sources.map((s) => s.path).sort(), included.sort());
  assert.ok(result.excluded.some((s) => s.path === 'docs/DATOS.md' && s.reason === 'sensitive'));
  assert.ok(result.excluded.some((s) => s.path === 'docs/large.txt' && s.reason === 'size-limit'));
  const markdown = await readFile(join(root, '02-DOCS/wiki/sources.md'), 'utf8');
  assert.ok(markdown.includes('](<../../docs/a [b](c)%23 %25.md>)'));
  assert.ok(markdown.includes("](<../../docs/kitchens_&_kitchenettes (3)'s.xlsx>)"));
  assert.ok(markdown.includes('](<../../docs/control%23%3F%25%3C%3E%0D%0A.md>)'));
  assert.ok(!markdown.includes('DO NOT COPY'));
  const before = await stat(join(root, '02-DOCS/wiki/.sources.json'));
  assert.equal(run(root).status, 0);
  assert.equal(run(root, '--check').status, 0);
  assert.equal((await stat(join(root, '02-DOCS/wiki/.sources.json'))).mtimeMs, before.mtimeMs);
});

test('corrupt state and configuration fail visibly without overwriting state', async (t) => {
  const root = await fixture(t);
  await put(root, 'README.md');
  assert.equal(run(root).status, 0);
  for (const bad of ['{broken', '{}', '{"version":1,"sources":[],"excluded":null}']) {
    await put(root, '02-DOCS/wiki/.sources.json', bad);
    const result = run(root);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /state/i);
    assert.equal(await readFile(join(root, '02-DOCS/wiki/.sources.json'), 'utf8'), bad);
  }
  await put(root, '02-DOCS/second-brain.json', '{"version":1,"maxFileBytes":0}');
  assert.equal(run(root).status, 2);
});

test('watch observes add, modify, and delete without a model', async (t) => {
  const root = await fixture(t);
  const child = spawn(process.execPath, [script, '--watch'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let errors = '';
  child.stderr.on('data', (data) => { errors += data; });
  t.after(() => { child.kill(); });
  async function until(predicate) {
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      try { if (await predicate(await state(root))) return; } catch (error) { assert.equal(error.code, 'ENOENT'); }
      await delay(50);
    }
    assert.fail(`watch timed out: ${errors}`);
  }
  await until((s) => s.sources.length === 0);
  await put(root, 'docs/new.mdx', '# New');
  await until((s) => s.sources.length === 1);
  const hash = (await state(root)).sources[0].hash;
  await put(root, 'docs/new.mdx', '# Updated');
  await until((s) => s.sources[0]?.hash !== hash);
  await unlink(join(root, 'docs/new.mdx'));
  await until((s) => s.sources.length === 0);
  child.kill();
  await new Promise((done) => child.once('exit', done));
});

test('--root targets the chosen repository and refuses symlinked output directories', async (t) => {
  const root = await fixture(t);
  await put(root, 'README.md');
  const result = spawnSync(process.execPath, [script, '--root', root], { cwd: tmpdir(), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal((await state(root)).sources[0].path, 'README.md');
  await rm(join(root, '02-DOCS/wiki'), { recursive: true });
  await mkdir(join(root, 'outside'));
  await symlink(join(root, 'outside'), join(root, '02-DOCS/wiki'));
  assert.equal(run(root).status, 2);
  await assert.rejects(readFile(join(root, 'outside/.sources.json')), { code: 'ENOENT' });
});

test('concurrent runs wait for the exclusive lock before reading or writing an inventory', async (t) => {
  const root = await fixture(t);
  await put(root, 'README.md');
  await put(root, '.second-brain.lock', `${process.pid}\n`);
  const child = spawn(process.execPath, [script], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => child.kill());
  const completion = new Promise((done) => child.once('exit', done));
  await delay(150);
  await assert.rejects(readFile(join(root, '02-DOCS/wiki/.sources.json')), { code: 'ENOENT' });
  await unlink(join(root, '.second-brain.lock'));
  assert.equal(await completion, 0);
  assert.equal((await state(root)).sources.length, 1);
  await assert.rejects(readFile(join(root, '.second-brain.lock')), { code: 'ENOENT' });
});
