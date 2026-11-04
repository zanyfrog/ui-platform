import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { withArtifactLock, storageKey, ArtifactBusyError } from '../src/storage.js';
import { withRoleBundleGraph } from '../src/role-bundle.js';
const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
async function temporary() { const root = await mkdtemp(path.join(tmpdir(), 'd6-')); roots.push(root); return root; }
function gate() { let release!: () => void; const promise = new Promise<void>(r => { release = r; }); return { promise, release }; }
it('serializes holders and measures waiting without replaying work', async () => {
  const root = await temporary(), entered = gate(), finish = gate(); let calls = 0;
  const first = withRoleBundleGraph(root, async () => { entered.release(); await finish.promise; });
  await entered.promise;
  const measurements: unknown[] = [];
  const second = withRoleBundleGraph(root, async () => { calls++; return 42; }, { timeoutMs: 1000, observe: m => measurements.push(m) });
  expect(calls).toBe(0); finish.release(); await first;
  expect(await second).toBe(42); expect(calls).toBe(1); expect(measurements).toHaveLength(1);
});
it('never replays a callback throwing the exact busy error', async () => {
  const root = await temporary(); let calls = 0;
  await expect(withRoleBundleGraph(root, async () => { calls++; throw new ArtifactBusyError(); }, { timeoutMs: 500 })).rejects.toBeInstanceOf(ArtifactBusyError);
  expect(calls).toBe(1);
});
it('rejects recursive graph and role-to-graph acquisition promptly', async () => {
  const root = await temporary();
  await withRoleBundleGraph(root, async () => {
    await expect(withRoleBundleGraph(root, async () => {})).rejects.toThrow('lock order violation');
  });
  await withArtifactLock(root, root, async () => {
    await expect(withRoleBundleGraph(root, async () => {})).rejects.toThrow('lock order violation');
    // Existing migration/provider coordination may acquire a distinct source
    // lock. This is not recursive acquisition or graph-order inversion.
    await expect(withArtifactLock(root, root, async () => 'source', 'another-role')).resolves.toBe('source');
  });
});
it('cancels a local waiter without releasing or bypassing its predecessor', async () => {
  const root = await temporary(), entered = gate(), finish = gate(), controller = new AbortController(); let calls = 0;
  const first = withRoleBundleGraph(root, async () => { entered.release(); await finish.promise; }); await entered.promise;
  const second = withRoleBundleGraph(root, async () => { calls++; }, { timeoutMs: 1000, signal: controller.signal });
  controller.abort(new Error('cancelled'));
  await expect(second).rejects.toThrow('cancelled');
  const third = withRoleBundleGraph(root, async () => { calls++; });
  expect(calls).toBe(0); finish.release(); await first; await third; expect(calls).toBe(1);
});
it('bounds local queue waiting and preserves the live lock', async () => {
  const root = await temporary(), entered = gate(), finish = gate();
  const first = withRoleBundleGraph(root, async () => { entered.release(); await finish.promise; }); await entered.promise;
  try { await expect(withRoleBundleGraph(root, async () => { throw new Error('must not enter'); }, { timeoutMs: 30 })).rejects.toBeInstanceOf(ArtifactBusyError); }
  finally { finish.release(); await first; }
});
it('bounds and cancels filesystem contention without stealing a live PID', async () => {
  const root = await temporary(), dir = path.join(root, '.uib', 'locks'); await mkdir(dir, { recursive: true });
  const file = path.join(dir, storageKey('visual-runtime-graph-v1') + '.lock'); await writeFile(file, String(process.pid));
  await expect(withRoleBundleGraph(root, async () => { throw new Error('must not enter'); }, { timeoutMs: 30 })).rejects.toBeInstanceOf(ArtifactBusyError);
  const controller = new AbortController(); const pending = withRoleBundleGraph(root, async () => {}, { timeoutMs: 1000, signal: controller.signal }); controller.abort();
  await expect(pending).rejects.toThrow(); expect(await readFile(file, 'utf8')).toBe(String(process.pid));
});
it('telemetry failures cannot change a successful transaction', async () => {
  const root = await temporary(); expect(await withRoleBundleGraph(root, async () => 7, { observe() { throw new Error('observer'); } })).toBe(7);
});
it('an admitted transaction is never interrupted by its acquisition deadline or abort', async () => {
  const root = await temporary(), entered = gate(), finish = gate(), controller = new AbortController(); let committed = false;
  const pending = withRoleBundleGraph(root, async () => { entered.release(); await finish.promise; committed = true; }, { timeoutMs: 1000, signal: controller.signal });
  await entered.promise; controller.abort(); finish.release(); await pending; expect(committed).toBe(true);
  expect(await withRoleBundleGraph(root, async () => 'released')).toBe('released');
});
it('captures current bytes after waiting and rechecks original authority at admission', async () => {
  const root = await temporary(), entered = gate(), finish = gate(), file = path.join(root, 'source.txt'); let authorized = true;
  await writeFile(file, 'before');
  const writer = withRoleBundleGraph(root, async () => { entered.release(); await finish.promise; await writeFile(file, 'after'); authorized = false; });
  await entered.promise;
  const reader = withRoleBundleGraph(root, () => readFile(file, 'utf8'));
  const rejected = withRoleBundleGraph(root, async () => { if (!authorized) throw new Error('original authority revoked'); await writeFile(file, 'unauthorized'); });
  const rejection = expect(rejected).rejects.toThrow('original authority revoked');
  finish.release(); await writer; expect(await reader).toBe('after'); await rejection;
  expect(await readFile(file, 'utf8')).toBe('after');
});
it('hands off a populated local graph queue to a real waiting process', async () => {
  const { alignedGraph } = await import('./helpers/graph-alignment.js');
  await alignedGraph(await temporary(), withRoleBundleGraph, withArtifactLock);
}, 15000);
