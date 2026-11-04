import { expect } from 'vitest';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { AsyncLocalStorage } from 'node:async_hooks';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { withArtifactLock } from '../../src/storage.js';
import type { withRoleBundleGraph } from '../../src/role-bundle.js';

type Event = { pid: number; seq: number; op: string; phase: string; [key: string]: unknown };
export async function alignedGraph(
  rootInput: string, graph: typeof withRoleBundleGraph, lock: typeof withArtifactLock,
) {
  const native = { open: fs.open, rm: fs.rm, readFile: fs.readFile };
  const root = await fs.realpath(rootInput);
  const run = randomUUID(), key = createHash('sha256').update('visual-runtime-graph-v1').digest('hex');
  const file = path.join(root, '.uib', 'locks', key + '.lock'), witness = path.join(root, 'exclusion.witness');
  const order = path.join(root, 'order.txt'), scope = new AsyncLocalStorage<string>();
  const events: Event[] = [], handles: Array<Awaited<ReturnType<typeof fs.open>>> = [];
  const emit = (phase: string, data = {}) => { events.push({ pid: process.pid, seq: events.length + 1, op: scope.getStore() ?? 'setup', phase, utc: new Date().toISOString(), mono: performance.now(), ...data }); };
  const errorData = (e: unknown) => ({ message: String(e), code: (e as NodeJS.ErrnoException).code });
  fs.open = (async (...args: Parameters<typeof fs.open>) => {
    if (String(args[0]) !== file) return native.open(...args);
    expect(args[1]).toBe('wx'); emit('open.attempt');
    try {
      const handle = await native.open(...args); handles.push(handle); emit('open.complete', { fd: handle.fd });
      return new Proxy(handle, { get(target, property) {
        const value = Reflect.get(target, property, target);
        if (typeof value !== 'function') return value;
        return async (...input: unknown[]) => {
          emit(String(property) + '.attempt', { input: property === 'writeFile' ? input : undefined });
          try { const result = await value.apply(target, input); emit(String(property) + '.complete', { fd: target.fd }); return result; }
          catch (e) { emit(String(property) + '.error', errorData(e)); throw e; }
        };
      } });
    } catch (e) { emit('open.error', errorData(e)); throw e; }
  }) as typeof fs.open;
  fs.rm = (async (...args: Parameters<typeof fs.rm>) => {
    if (String(args[0]) !== file) return native.rm(...args);
    emit('unlink.attempt');
    try { await native.rm(...args); emit('unlink.complete'); }
    catch (e) { emit('unlink.error', errorData(e)); throw e; }
  }) as typeof fs.rm;
  fs.readFile = (async (...args: Parameters<typeof fs.readFile>) => {
    const result = await native.readFile(...args);
    if (String(args[0]) === file) emit('owner.read', { actualText: String(result) });
    return result;
  }) as typeof fs.readFile;
  syncBuiltinESMExports();
  let release!: () => void, entered!: () => void;
  const hold = new Promise<void>(r => { release = r; }), admitted = new Promise<void>(r => { entered = r; });
  const callback = async (id: string, initial = false) => {
    emit('callback.enter');
    // A collision fails immediately. This witness never waits or serializes work.
    const sentinel = await native.open(witness, 'wx');
    try {
      emit('witness.owned');
      if (initial) { entered(); await hold; }
      await fs.appendFile(order, id + '\n');
    } finally { await sentinel.close(); await native.rm(witness); emit('witness.released'); }
    emit('callback.exit');
  };
  let holder: Promise<unknown> | undefined, queued: Promise<unknown>[] = [];
  let child: ReturnType<typeof spawn> | undefined, exited: Promise<unknown[]> | undefined;
  let stdout = '', stderr = '', childRecord: any;
  const messages: any[] = [];
  try {
    await fs.writeFile(order, '');
    holder = scope.run('holder', () => graph(root, () => callback('holder', true)));
    // Attach a handler immediately; still propagate through the explicit awaits.
    void holder.catch(() => {});
    await admitted;
    expect(events.some(e => e.op === 'holder' && e.phase === 'sync.complete')).toBe(true);
    child = spawn(process.execPath, [fileURLToPath(new URL('./graph-child.mjs', import.meta.url)), root, run], {
      windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    exited = once(child, 'exit');
    child.stdout!.on('data', b => { stdout += String(b); }); child.stderr!.on('data', b => { stderr += String(b); });
    let readyResolve!: (m: any) => void, contendResolve!: (m: any) => void;
    const ready = new Promise<any>(r => { readyResolve = r; }), contended = new Promise<any>(r => { contendResolve = r; });
    child.on('message', (m: any) => { messages.push(m); if (m.kind === 'ready') readyResolve(m); if (m.kind === 'contended') contendResolve(m); if (m.kind === 'result') childRecord = m; });
    const earlyExit = exited.then(([code]) => { throw new Error('Child exited before phase: ' + code + '\n' + stderr); });
    void earlyExit.catch(() => {});
    const identity = await Promise.race([ready, earlyExit]);
    expect(identity.root).toBe(root); expect(identity.key).toBe(key); expect(identity.run).toBe(run);
    for (let index = 0; index < 4; index++) {
      const id = 'local-' + index;
      emit('local.registration', { id });
      const pending = scope.run(id, () => lock(root, root, () => callback(id), 'visual-runtime-graph-v1', { timeoutMs: 5000 }));
      void pending.catch(() => {}); queued.push(pending);
    }
    child.send({ kind: 'begin' });
    const contention = await Promise.race([contended, earlyExit]);
    expect(contention.code).toBe('EEXIST'); expect(contention.file).toBe(file);
    expect(events.filter(e => e.phase === 'callback.enter').map(e => e.op)).toEqual(['holder']);
    expect(await native.readFile(file, 'utf8')).toBe(String(process.pid));
    expect(events.filter(e => e.phase === 'unlink.attempt')).toHaveLength(0);
    emit('holder.release-command', { childContentionSeq: contention.seq }); release();
    await holder; await Promise.all(queued);
    expect((await exited)[0], stderr).toBe(0);
    expect(childRecord).toBeDefined(); expect(childRecord.events.every((e: Event, i: number) => e.seq === i + 1)).toBe(true);
    const lines = (await fs.readFile(order, 'utf8')).trim().split('\n');
    expect(lines[0]).toBe('holder');
    expect(lines.slice(1).sort()).toEqual(['child', 'local-0', 'local-1', 'local-2', 'local-3']);
    expect(lines.filter(s => s.startsWith('local-'))).toEqual(['local-0', 'local-1', 'local-2', 'local-3']);
    const all = [...events, ...childRecord.events] as Event[];
    for (const op of ['holder', 'local-0', 'local-1', 'local-2', 'local-3', 'child']) {
      const list = all.filter(e => e.op === op);
      for (const phase of ['callback.enter', 'witness.owned', 'witness.released', 'callback.exit', 'writeFile.complete', 'sync.complete', 'close.complete', 'unlink.complete'])
        expect(list.filter(e => e.phase === phase), op + ' ' + phase).toHaveLength(1);
      const pos = (phase: string) => list.findIndex(e => e.phase === phase);
      expect(pos('sync.complete')).toBeLessThan(pos('callback.enter'));
      expect(pos('callback.exit')).toBeLessThan(pos('close.complete'));
      expect(pos('close.complete')).toBeLessThan(pos('unlink.complete'));
    }
    expect(handles.every(h => h.fd === -1)).toBe(true);
    await expect(native.readFile(file)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(native.readFile(witness)).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    release();
    // Release only known fixture work/children, not real storage. No acquisition retry.
    if (child && child.exitCode === null && child.signalCode === null) { child.kill(); await exited; }
    await Promise.allSettled([...(holder ? [holder] : []), ...queued]);
    fs.open = native.open; fs.rm = native.rm; fs.readFile = native.readFile; syncBuiltinESMExports();
    const evidence = process.env.GRAPH_VERIFY_EVIDENCE;
    if (evidence) await fs.writeFile(path.join(evidence, 'graph-integration.json'), JSON.stringify({ run, root, key, parent: { pid: process.pid, ppid: process.ppid, timeOrigin: performance.timeOrigin, executable: process.execPath }, events, messages, childRecord, stdout, stderr,
      residual: { handles: handles.map(h => h.fd), files: await fs.readdir(root) }, sequenceCoverage: 'Per-process order only; IPC barriers establish causality. No cross-clock total-order claim.' }, null, 2) + '\n', { flag: 'wx' });
  }
}
