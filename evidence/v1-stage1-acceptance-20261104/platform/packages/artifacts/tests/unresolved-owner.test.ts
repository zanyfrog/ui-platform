import { afterEach, expect, it, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const hooks = vi.hoisted(() => ({ beforeWrite: undefined as undefined | (() => Promise<void>), afterRead: undefined as undefined | ((text: string) => Promise<void>), afterRemove: undefined as undefined | (() => Promise<void>), afterRecoveryOpen: undefined as undefined | (() => Promise<void>), fail: '', reads: 0 }));
vi.mock('node:fs/promises', async importOriginal => {
  const fs = await importOriginal<typeof import('node:fs/promises')>();
  return { ...fs,
    open: async (...args: Parameters<typeof fs.open>) => {
      const handle = await fs.open(...args);
      if (String(args[0]).endsWith('.lock.recovery')) await hooks.afterRecoveryOpen?.();
      if (!String(args[0]).endsWith('.lock') || args[1] !== 'wx') return handle;
      return new Proxy(handle, { get(target, key) {
        const value = Reflect.get(target, key, target);
        if (typeof value !== 'function') return value;
        return async (...input: unknown[]) => {
          if (key === 'writeFile') await hooks.beforeWrite?.();
          if (key === hooks.fail) { hooks.fail = ''; if (key === 'close') await value.apply(target, input); throw new Error('injected ' + String(key)); }
          return value.apply(target, input);
        };
      } });
    },
    readFile: async (...args: Parameters<typeof fs.readFile>) => {
      const value = await fs.readFile(...args);
      if (String(args[0]).endsWith('.lock')) { hooks.reads++; await hooks.afterRead?.(String(value)); }
      return value;
    },
    rm: async (...args: Parameters<typeof fs.rm>) => {
      if (String(args[0]).endsWith('.lock') && hooks.fail === 'rm') { hooks.fail = ''; throw new Error('injected rm'); }
      await fs.rm(...args);
      if (String(args[0]).endsWith('.lock')) await hooks.afterRemove?.();
    },
  };
});
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { withArtifactLock, storageKey, ArtifactOwnerUnresolvedError, ArtifactBusyError } from '../src/storage.js';
const roots: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); hooks.beforeWrite = undefined; hooks.afterRead = undefined; hooks.afterRemove = undefined; hooks.afterRecoveryOpen = undefined; hooks.fail = ''; hooks.reads = 0; for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
const gate = () => { let release!: () => void; const wait = new Promise<void>(r => release = r); return { wait, release }; };
async function fixture() { const root = await mkdtemp(path.join(os.tmpdir(), 'unresolved-owner-')); roots.push(root); const dir = path.join(root, '.uib/locks'); await mkdir(dir, { recursive: true }); return { root, file: path.join(dir, storageKey('test-owner') + '.lock') }; }
const acquire = <T>(root: string, work: () => Promise<T>, options = {}) => withArtifactLock(root, root, work, 'test-owner', { timeoutMs: 5000, ...options });

it('reinspects a real child publisher beyond four empty observations without stealing it', async () => {
  const { root, file } = await fixture();
  // The child uses the existing create/write/sync/close/unlink protocol with an
  // IPC gate before PID write. The reader is the actual production acquisition.
  const child = spawn(process.execPath, ['--input-type=module', '-e', `
    import {open,rm} from 'node:fs/promises';
    const handle=await open(process.argv[1],'wx'); process.send('created');
    await new Promise(r=>process.once('message',r)); await handle.writeFile(String(process.pid)); await handle.sync();
    process.send('published'); await new Promise(r=>process.once('message',r)); await handle.close(); await rm(process.argv[1]); process.disconnect();
  `, file], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  const exited = once(child, 'exit'); await once(child, 'message');
  const observed = gate(); hooks.afterRead = async text => { if (!text && hooks.reads >= 6) observed.release(); };
  let called = false; const pending = acquire(root, async () => { called = true; return 42; });
  try {
    await observed.wait; expect(called).toBe(false); expect(await readFile(file, 'utf8')).toBe('');
    const published = once(child, 'message'); child.send('publish'); await published;
    expect(await readFile(file, 'utf8')).toBe(String(child.pid)); child.send('finish');
    expect(await pending).toBe(42); expect((await exited)[0]).toBe(0);
  } finally { if (child.exitCode === null && child.signalCode === null) { child.send('finish'); await exited; } }
});

it.each(['', 'not-a-pid', 'NaN', '1e3', '-1', '12x'])('fails closed with typed unresolved ownership for %j', async text => {
  const { root, file } = await fixture(); await writeFile(file, text); let called = false;
  const measurement: any[] = [];
  const pending = acquire(root, async () => { called = true; }, { timeoutMs: 80, observe: (m: any) => measurement.push(m) });
  await expect(pending).rejects.toMatchObject({ name: 'ArtifactOwnerUnresolvedError', code: 'source.owner-unresolved', status: 503 });
  expect(called).toBe(false); expect(await readFile(file, 'utf8')).toBe(text); expect(measurement[0].acquired).toBe(false);
});

it('shares the original deadline with local queue waiting instead of resetting on empty reads', async () => {
  const { root, file } = await fixture(), entered = gate(), finish = gate();
  const first = acquire(root, async () => { entered.release(); await finish.wait; }); await entered.wait;
  let clock = 0; vi.spyOn(performance, 'now').mockImplementation(() => clock);
  hooks.afterRemove = async () => { hooks.afterRemove = undefined; await writeFile(file, ''); };
  hooks.afterRead = async () => { clock += 10; };
  const measurements: any[] = [];
  const waiting = acquire(root, async () => { throw new Error('must not enter'); }, { timeoutMs: 160, observe: (m: any) => measurements.push(m) });
  const rejection = expect(waiting).rejects.toBeInstanceOf(ArtifactOwnerUnresolvedError);
  clock = 140;
  finish.release(); await first; await rejection;
  expect(measurements[0].waitMs).toBe(160); expect(await readFile(file, 'utf8')).toBe('');
});

it('cancels unresolved inspection promptly and never enters or deletes the unknown lock', async () => {
  const { root, file } = await fixture(); await writeFile(file, ''); const controller = new AbortController(), observed = gate();
  hooks.afterRead = async () => observed.release(); let calls = 0;
  const pending = acquire(root, async () => { calls++; }, { signal: controller.signal });
  const reason = new Error('cancel unresolved'); const rejection = expect(pending).rejects.toBe(reason);
  await observed.wait; controller.abort(reason); await rejection;
  expect(calls).toBe(0); expect(await readFile(file, 'utf8')).toBe('');
});

it('honors pre-aborted acquisition without touching an owner file', async () => {
  const { root, file } = await fixture(); const controller = new AbortController(); controller.abort(new Error('pre-aborted'));
  await expect(acquire(root, async () => {}, { signal: controller.signal })).rejects.toThrow('pre-aborted'); await expect(access(file)).rejects.toThrow();
});

it('restarts from exclusive creation when an unresolved file disappears', async () => {
  const { root, file } = await fixture(); await writeFile(file, ''); let once = false;
  hooks.afterRead = async () => { if (!once) { once = true; await rm(file); } };
  expect(await acquire(root, async () => 'owned')).toBe('owned');
});

it('does not infer a dead owner from replacement metadata', async () => {
  const { root, file } = await fixture(); await writeFile(file, ''); let once = false;
  hooks.afterRead = async () => { if (!once) { once = true; await rm(file); await writeFile(file, String(process.pid)); } };
  await expect(acquire(root, async () => {}, { timeoutMs: 80 })).rejects.toBeInstanceOf(ArtifactBusyError);
  expect(await readFile(file, 'utf8')).toBe(String(process.pid));
});

it('uses the live-owner classification when PID publication occurs between reads', async () => {
  const { root, file } = await fixture(); await writeFile(file, ''); const seen: string[] = [];
  hooks.afterRead = async text => { seen.push(text); if (!text) await writeFile(file, String(process.pid)); };
  await expect(acquire(root, async () => {}, { timeoutMs: 100 })).rejects.toMatchObject({ code: 'source.busy' });
  expect(seen[0]).toBe(''); expect(seen).toContain(String(process.pid)); expect(await readFile(file, 'utf8')).toBe(String(process.pid));
});

it('does not admit work when PID publication consumes the remaining acquisition deadline', async () => {
  const { root, file } = await fixture(); let clock = 0; vi.spyOn(performance, 'now').mockImplementation(() => clock);
  hooks.beforeWrite = async () => { clock = 5000; }; let calls = 0;
  await expect(acquire(root, async () => { calls++; })).rejects.toMatchObject({ code: 'source.busy' });
  expect(calls).toBe(0); await expect(access(file)).rejects.toThrow();
});

it.each(['writeFile', 'sync', 'close', 'rm'])('preserves failure from %s without replaying work', async failure => {
  const { root, file } = await fixture(); hooks.fail = failure; let calls = 0;
  await expect(acquire(root, async () => { calls++; })).rejects.toThrow('injected ' + failure);
  expect(calls).toBe(failure === 'rm' || failure === 'close' ? 1 : 0);
  if (failure !== 'rm' && failure !== 'close') await expect(access(file)).rejects.toThrow();
  else expect(await readFile(file, 'utf8')).toBe(String(process.pid));
});

it.each(['', 'live'])('rechecks %j replacement after a dead-owner observation before recovery removal', async replacement => {
  const { root, file } = await fixture();
  const dead = spawn(process.execPath, ['-e', 'process.exit(0)'], { windowsHide: true, stdio: 'ignore' }); await once(dead, 'exit');
  await writeFile(file, String(dead.pid));
  const next = replacement === 'live' ? String(process.pid) : '';
  hooks.afterRecoveryOpen = async () => { hooks.afterRecoveryOpen = undefined; await rm(file); await writeFile(file, next); };
  const pending = acquire(root, async () => { throw new Error('must not enter'); }, { timeoutMs: 100 });
  if (replacement === 'live') await expect(pending).rejects.toMatchObject({ code: 'source.busy' });
  else await expect(pending).rejects.toBeInstanceOf(ArtifactOwnerUnresolvedError);
  expect(await readFile(file, 'utf8')).toBe(next); await expect(access(file + '.recovery')).rejects.toThrow();
});

it('does not replay an unresolved error thrown inside admitted work or replace it with cancellation', async () => {
  const { root } = await fixture(); const controller = new AbortController(); let calls = 0; const error = new ArtifactOwnerUnresolvedError();
  await expect(acquire(root, async () => { calls++; controller.abort(); throw error; }, { signal: controller.signal })).rejects.toBe(error);
  expect(calls).toBe(1);
});
