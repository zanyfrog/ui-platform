import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import type { FileHandle } from 'node:fs/promises';
import ts from 'typescript';

type Fault = { phase: string; when: 'before' | 'after'; error: unknown; effect?: () => void | Promise<void> };
const hooks = vi.hoisted(() => ({
  file: '', guard: '', events: [] as string[], faults: [] as Fault[], opens: 0,
  handles: [] as Array<{ kind: string; handle: FileHandle }>,
  afterOpen: undefined as undefined | ((phase: string) => Promise<void>),
  afterWrite: undefined as undefined | (() => void | Promise<void>),
  callbacks: 0,
}));
vi.mock('node:fs/promises', async importOriginal => {
  const fs = await importOriginal<typeof import('node:fs/promises')>();
  async function step<T>(phase: string, action: () => Promise<T>): Promise<T> {
    hooks.events.push(phase + ':attempt');
    const fault = hooks.faults.find(f => f.phase === phase);
    if (fault) hooks.faults.splice(hooks.faults.indexOf(fault), 1);
    if (fault?.when === 'before') { await fault.effect?.(); throw fault.error; }
    const value = await action();
    hooks.events.push(phase + ':done');
    if (fault?.when === 'after') { await fault.effect?.(); throw fault.error; }
    return value;
  }
  return { ...fs,
    open: async (...args: Parameters<typeof fs.open>) => {
      const file = String(args[0]);
      if (file !== hooks.file && file !== hooks.guard) return fs.open(...args);
      expect(args[1]).toBe('wx');
      const phase = file === hooks.guard ? 'guard.open' : ++hooks.opens === 1 ? 'initial.open' : 'replacement.open';
      const handle = await step(phase, () => fs.open(...args));
      const kind = file === hooks.guard ? 'guard' : 'main';
      hooks.handles.push({ kind, handle });
      await hooks.afterOpen?.(phase);
      return new Proxy(handle, { get(target, key) {
        const value = Reflect.get(target, key, target);
        if (typeof value !== 'function') return value;
        return async (...input: unknown[]) => {
          const result = await step(kind + '.' + String(key), () => value.apply(target, input));
          if (key === 'writeFile') await hooks.afterWrite?.();
          return result;
        };
      } });
    },
    readFile: async (...args: Parameters<typeof fs.readFile>) => {
      if (String(args[0]) !== hooks.file) return fs.readFile(...args);
      return step('owner.read', () => fs.readFile(...args));
    },
    rm: async (...args: Parameters<typeof fs.rm>) => {
      const file = String(args[0]);
      if (file !== hooks.file && file !== hooks.guard) return fs.rm(...args);
      const phase = file === hooks.guard ? 'guard.unlink' : args[1] ? 'main.unlink' : 'dead.unlink';
      return step(phase, () => fs.rm(...args));
    },
  };
});
import { withArtifactLock, storageKey, ArtifactBusyError, ArtifactOwnerUnresolvedError } from '../src/storage.js';

const native = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
let root = '', identity = '', deadPid: number;
const rows: unknown[] = [];
let outcomes: unknown[] = [];
function describe(value: unknown): unknown {
  if (value === undefined) return { type: 'undefined' };
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack,
    code: (value as NodeJS.ErrnoException).code,
    ...(Object.hasOwn(value, 'cause') ? { cause: describe(value.cause) } : {}),
    ...(value instanceof AggregateError ? { errors: value.errors.map(describe) } : {}),
  };
  return value;
}
beforeAll(async () => {
  const child = spawn(process.execPath, ['-e', 'process.exit(0)'], { windowsHide: true, stdio: 'ignore' });
  expect((await once(child, 'exit'))[0]).toBe(0);
  deadPid = child.pid!;
  expect(deadPid).toBeGreaterThan(0);
  expect(() => process.kill(deadPid, 0)).toThrow();
});
const bytes = async (file: string) => {
  try { return (await native.readFile(file)).toString('hex'); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; }
};
function safeRoot() {
  const relative = path.relative(os.tmpdir(), root);
  if (!root || !path.basename(root).startsWith('foundation-cleanup-') || relative.startsWith('..') || path.isAbsolute(relative))
    throw new Error('Disposable root isolation failed');
}
afterEach(async context => {
  vi.restoreAllMocks();
  if (root) {
    safeRoot();
    rows.push({ test: context.task.name, root, identity, key: storageKey(identity),
      events: hooks.events.slice(), opens: hooks.opens, callbacks: hooks.callbacks,
      handles: hooks.handles.map(h => ({ kind: h.kind, fd: h.handle.fd })),
      mainHex: await bytes(hooks.file), guardHex: await bytes(hooks.guard),
      unusedFaults: hooks.faults.map(f => f.phase),
      outcomes: outcomes.map(describe),
    });
    // Faults can deliberately leave a real handle open. Capture it first, then
    // close only these known disposable handles; never infer production success.
    for (const { handle } of hooks.handles) if (handle.fd >= 0) await handle.close();
    await native.rm(root, { recursive: true, force: true });
  }
  if (process.env.FOUNDATION_CLEANUP_EVIDENCE) {
    await native.writeFile(path.join(process.env.FOUNDATION_CLEANUP_EVIDENCE, 'fault-lifecycle.json'), JSON.stringify({ deadPid, rows }, null, 2) + '\n');
  }
  root = ''; identity = ''; hooks.file = ''; hooks.guard = '';
  hooks.events = []; hooks.faults = []; hooks.opens = 0; hooks.handles = [];
  hooks.afterOpen = undefined; hooks.afterWrite = undefined; hooks.callbacks = 0;
  outcomes = [];
});
async function fixture(dead = false) {
  root = await native.mkdtemp(path.join(os.tmpdir(), 'foundation-cleanup-'));
  safeRoot();
  const anchor = path.join(root, 'probe-card', 'component.visual.json');
  await native.mkdir(path.dirname(anchor)); await native.writeFile(anchor, '{}');
  identity = await native.realpath(anchor);
  expect(identity.toLowerCase()).not.toContain('ui-platform\\components\\');
  await native.mkdir(path.join(root, '.uib', 'locks'), { recursive: true });
  hooks.file = path.join(root, '.uib', 'locks', storageKey(identity) + '.lock');
  hooks.guard = hooks.file + '.recovery';
  expect(storageKey(identity)).not.toBe('d179aa405e5fabc10c0dcd063888480c115eb75f2ef03df9f74ce3ec26e0043e');
  if (dead) {
    try { process.kill(deadPid, 0); throw new Error('PID unexpectedly live'); }
    catch (e) { expect((e as NodeJS.ErrnoException).code).toBe('ESRCH'); }
    await native.writeFile(hooks.file, String(deadPid));
  }
}
function acquire(work: () => Promise<unknown> = async () => 42, options = {}) {
  return withArtifactLock(root, path.dirname(identity), async () => {
    hooks.callbacks++; hooks.events.push('callback'); return work();
  }, identity, { timeoutMs: 5000, ...options });
}
const fault = (phase: string, when: 'before' | 'after' = 'before', error: unknown = new Error(phase), effect?: () => void | Promise<void>) => {
  hooks.faults.push({ phase, when, error, effect }); return error;
};
async function rejected(pending: Promise<unknown>) {
  try { await pending; } catch (error) { outcomes.push(error); return error; }
  throw new Error('Expected rejection');
}
const count = (phase: string) => hooks.events.filter(e => e === phase + ':attempt').length;
const before = (a: string, b: string) => expect(hooks.events.indexOf(a)).toBeLessThan(hooks.events.indexOf(b));
async function cleanMain() {
  expect(count('main.close')).toBe(1); expect(count('main.unlink')).toBe(1);
  expect(await bytes(hooks.file)).toBeNull();
  expect(hooks.handles.filter(h => h.kind === 'main').every(h => h.handle.fd === -1)).toBe(true);
}
function aggregate(error: unknown, errors: unknown[], phases: string[]) {
  expect(error).toBeInstanceOf(AggregateError);
  const a = error as AggregateError;
  expect(a.errors).toHaveLength(errors.length);
  errors.forEach((e, i) => expect(a.errors[i]).toBe(e));
  expect(a.cause).toBe(errors[0]); expect(a.message).toContain('cleanup failed: ' + phases.join(', '));
  for (const key of ['status', 'code', 'committed', 'recoveryRequired']) expect(a).not.toHaveProperty(key);
}

it.each([false, true])('F01/F02 successful release, replacement=%s', async dead => {
  await fixture(dead); const result = Object.freeze({ result: 42 });
  expect(await acquire(async () => result)).toBe(result); expect(hooks.callbacks).toBe(1);
  await cleanMain(); before('main.writeFile:done', 'main.sync:attempt'); before('main.sync:done', 'callback');
  if (dead) {
    expect(count('owner.read')).toBe(2);
    before('owner.read:done', 'dead.unlink:attempt'); before('dead.unlink:done', 'replacement.open:attempt');
    before('replacement.open:done', 'guard.close:attempt'); before('guard.close:done', 'guard.unlink:attempt');
    before('guard.unlink:done', 'main.writeFile:attempt'); expect(await bytes(hooks.guard)).toBeNull();
  }
});
it.each(['EEXIST', 'EACCES'])('F03 unowned guard open failure %s', async code => {
  await fixture(true); await native.writeFile(hooks.guard, 'foreign guard');
  const e = Object.assign(new Error(code), { code }); fault('guard.open', 'before', e);
  const out = await rejected(acquire(undefined, { timeoutMs: 0 }));
  if (code === 'EEXIST') expect(out).toBeInstanceOf(ArtifactBusyError); else expect(out).toBe(e);
  expect(hooks.handles).toHaveLength(0); expect(count('guard.close')).toBe(0); expect(count('guard.unlink')).toBe(0);
  expect(await native.readFile(hooks.guard, 'utf8')).toBe('foreign guard');
  expect(await native.readFile(hooks.file, 'utf8')).toBe(String(deadPid)); expect(count('main.unlink')).toBe(0);
});
it.each(['', 'bad', 'live'])('F04 changed guarded reread %s', async text => {
  await fixture(true); const replacement = text === 'live' ? String(process.pid) : text;
  hooks.afterOpen = async phase => { if (phase === 'guard.open') await native.writeFile(hooks.file, replacement); };
  const out = await rejected(acquire(undefined, { timeoutMs: 0 }));
  expect(out).toBeInstanceOf(text === 'live' ? ArtifactBusyError : ArtifactOwnerUnresolvedError);
  expect(await native.readFile(hooks.file, 'utf8')).toBe(replacement);
  expect(count('dead.unlink')).toBe(0); expect(count('main.close')).toBe(0); expect(count('main.unlink')).toBe(0);
  expect(count('guard.close')).toBe(1); expect(count('guard.unlink')).toBe(1); expect(hooks.callbacks).toBe(0);
});
it.each([
  ['dead.unlink', 'ENOENT'], ['dead.unlink', 'EACCES'], ['replacement.open', 'EEXIST'], ['replacement.open', 'EIO'],
])('F05 %s failure %s never grants main ownership', async (phase, code) => {
  await fixture(true); const e = Object.assign(new Error(code), { code });
  fault(phase, 'before', e);
  // A replacement-create race must preserve a competing winner's file.
  if (phase === 'replacement.open' && code === 'EEXIST') {
    hooks.faults[0].effect = async () => { await native.writeFile(hooks.file, String(process.pid)); };
  }
  const out = await rejected(acquire(undefined, { timeoutMs: 0 }));
  if (code === 'ENOENT' || code === 'EEXIST') expect(out).toBeInstanceOf(ArtifactBusyError); else expect(out).toBe(e);
  expect(count('main.close')).toBe(0); expect(count('main.unlink')).toBe(0); expect(hooks.callbacks).toBe(0);
  expect(count('guard.close')).toBe(1); expect(count('guard.unlink')).toBe(1);
  if (phase === 'dead.unlink') expect(await native.readFile(hooks.file, 'utf8')).toBe(String(deadPid));
  if (phase === 'replacement.open' && code === 'EEXIST') expect(await native.readFile(hooks.file, 'utf8')).toBe(String(process.pid));
});
it.each(['before', 'after'] as const)('F06 guard close rejects %s native close', async when => {
  await fixture(true); const e = fault('guard.close', when);
  expect(await rejected(acquire())).toBe(e); expect(hooks.callbacks).toBe(0);
  expect(count('main.writeFile')).toBe(0); expect(count('main.sync')).toBe(0);
  expect(count('guard.close')).toBe(1); expect(count('guard.unlink')).toBe(0); expect(await bytes(hooks.guard)).toBe('');
  expect(hooks.handles.find(h => h.kind === 'guard')!.handle.fd === -1).toBe(when === 'after'); await cleanMain();
});
it.each(['before', 'after'] as const)('F07 guard unlink rejects %s deletion', async when => {
  await fixture(true); const e = fault('guard.unlink', when);
  expect(await rejected(acquire())).toBe(e); expect(hooks.callbacks).toBe(0); expect(count('main.writeFile')).toBe(0);
  expect(await bytes(hooks.guard)).toBe(when === 'before' ? '' : null); await cleanMain(); expect(hooks.opens).toBe(2);
});
it.each([false, true])('F08/F09 publication faults, replacement=%s', async dead => {
  // Separate acquisitions use separate tests below to avoid any automatic retry.
  await fixture(dead); const e = fault('main.writeFile'); expect(await rejected(acquire())).toBe(e);
  expect(hooks.callbacks).toBe(0); expect(count('main.sync')).toBe(0); await cleanMain();
});
it.each([false, true])('F09 PID sync fails, replacement=%s', async dead => {
  await fixture(dead); const e = fault('main.sync');
  hooks.afterWrite = async () => {
    expect(count('main.writeFile')).toBe(1);
    expect(await native.readFile(hooks.file, 'utf8')).toBe(String(process.pid));
  };
  expect(await rejected(acquire())).toBe(e); expect(hooks.callbacks).toBe(0); await cleanMain();
});
it.each([[false, 'before'], [false, 'after'], [true, 'before'], [true, 'after']] as const)(
  'F10 main close rejects replacement=%s %s delegation', async (dead, when) => {
    await fixture(dead); const e = fault('main.close', when); expect(await rejected(acquire())).toBe(e);
    expect(hooks.callbacks).toBe(1); expect(count('main.close')).toBe(1); expect(count('main.unlink')).toBe(0);
    expect(await native.readFile(hooks.file, 'utf8')).toBe(String(process.pid));
    expect(hooks.handles.find(h => h.kind === 'main')!.handle.fd === -1).toBe(when === 'after');
  });
it.each([[false, 'before'], [false, 'after'], [true, 'before'], [true, 'after']] as const)(
  'F11 main unlink rejects replacement=%s %s deletion', async (dead, when) => {
    await fixture(dead); const e = fault('main.unlink', when); expect(await rejected(acquire())).toBe(e);
    expect(hooks.callbacks).toBe(1); expect(count('main.close')).toBe(1); expect(count('main.unlink')).toBe(1);
    expect(hooks.handles.every(h => h.handle.fd === -1)).toBe(true);
    expect(await bytes(hooks.file)).toBe(when === 'before' ? Buffer.from(String(process.pid)).toString('hex') : null);
  });
const primaries = [Object.freeze(new Error('frozen callback')), new ArtifactBusyError(), new ArtifactOwnerUnresolvedError(), 7, null, undefined];
it.each(primaries.map((value, i) => ({ value, i })))('F12 callback identity $i', async ({ value }) => {
  await fixture(); const controller = new AbortController();
  expect(await rejected(acquire(async () => { controller.abort(new Error('late abort')); throw value; }, { signal: controller.signal }))).toBe(value);
  expect(hooks.callbacks).toBe(1); expect(hooks.opens).toBe(1); await cleanMain();
});
it('F13 pre-abort leaves foreign files untouched', async () => {
  await fixture(); await native.writeFile(hooks.file, 'foreign'); const controller = new AbortController();
  const reason = Object.freeze(new Error('cancel')); controller.abort(reason);
  expect(await rejected(acquire(undefined, { signal: controller.signal }))).toBe(reason);
  expect(hooks.opens).toBe(0); expect(hooks.callbacks).toBe(0); expect(await native.readFile(hooks.file, 'utf8')).toBe('foreign');
});
it('F14 abort after replacement still releases guard and publishes before original admission refusal', async () => {
  await fixture(true); const controller = new AbortController(), reason = new Error('before admission');
  hooks.afterOpen = async phase => { if (phase === 'replacement.open') controller.abort(reason); };
  expect(await rejected(acquire(undefined, { signal: controller.signal }))).toBe(reason);
  expect(hooks.callbacks).toBe(0); before('guard.unlink:done', 'main.writeFile:attempt'); expect(count('main.sync')).toBe(1); await cleanMain();
});
it.each([false, true])('F15 original deadline consumed in publication, replacement=%s', async dead => {
  await fixture(dead); let clock = 0; vi.spyOn(performance, 'now').mockImplementation(() => clock);
  hooks.afterWrite = () => { clock = 5000; };
  expect(await rejected(acquire())).toBeInstanceOf(ArtifactBusyError); expect(hooks.callbacks).toBe(0); await cleanMain();
});
it.each([['main.writeFile', 'main.close'], ['main.sync', 'main.unlink']])('F16 %s primary with %s cleanup', async (phase, cleanup) => {
  await fixture(true); const p = fault(phase), c = fault(cleanup);
  aggregate(await rejected(acquire()), [p, c], [cleanup]); expect(hooks.callbacks).toBe(0); expect(hooks.opens).toBe(2);
  expect(count('main.unlink')).toBe(cleanup === 'main.close' ? 0 : 1);
});
it.each(['main.close', 'main.unlink'])('F17 callback and %s failure', async cleanup => {
  await fixture(); const p = new ArtifactBusyError(), c = fault(cleanup);
  aggregate(await rejected(acquire(async () => { throw p; })), [p, c], [cleanup]);
  expect(hooks.callbacks).toBe(1); expect(hooks.opens).toBe(1);
});
it.each(['', 'live'])('F18 reread primary plus guard close, %s', async text => {
  await fixture(true); const value = text ? String(process.pid) : '';
  hooks.afterOpen = async phase => { if (phase === 'guard.open') await native.writeFile(hooks.file, value); };
  const c = fault('guard.close'), out = await rejected(acquire());
  const p = (out as AggregateError).cause;
  expect(p).toBeInstanceOf(text ? ArtifactBusyError : ArtifactOwnerUnresolvedError);
  aggregate(out, [p, c], ['guard.close']); expect(count('main.close')).toBe(0); expect(count('main.unlink')).toBe(0);
  expect(await native.readFile(hooks.file, 'utf8')).toBe(value); expect(hooks.opens).toBe(1);
});
it.each([['guard.unlink', 'main.close'], ['guard.close', 'main.close'], ['guard.unlink', 'main.unlink']])(
  'F19 cleanup pair %s then %s', async (first, second) => {
    await fixture(true); const a = fault(first), b = fault(second);
    aggregate(await rejected(acquire()), [a, b], [first, second]); expect(hooks.callbacks).toBe(0); expect(count('main.close')).toBe(1);
    expect(count('main.unlink')).toBe(second === 'main.close' ? 0 : 1); expect(hooks.opens).toBe(2);
    expect(count('guard.unlink')).toBe(first === 'guard.close' ? 0 : 1);
  });
it.each([new ArtifactBusyError(), new ArtifactOwnerUnresolvedError()])('F20 cleanup busy family is terminal despite abort: %s', async error => {
  await fixture(true); const controller = new AbortController();
  fault('guard.unlink', 'before', error, () => controller.abort(new Error('late cancellation')));
  expect(await rejected(acquire(undefined, { signal: controller.signal }))).toBe(error);
  expect(hooks.opens).toBe(2); expect(hooks.callbacks).toBe(0); await cleanMain();
});
it.each([undefined, null, Object.freeze(new Error('frozen')), new AggregateError([new Error('nested')], 'nested journal')].map((value, i) => ({ value, i })))(
  'F21 composite primary identity without flattening $i', async ({ value }) => {
    await fixture(); const c = fault('main.unlink');
    aggregate(await rejected(acquire(async () => { throw value; })), [value, c], ['main.unlink']); expect(hooks.callbacks).toBe(1);
  });
it('F21 identical cleanup references remain two ordered occurrences', async () => {
  await fixture(true); const shared = Object.freeze(new Error('shared')); fault('guard.unlink', 'before', shared); fault('main.unlink', 'before', shared);
  aggregate(await rejected(acquire()), [shared, shared], ['guard.unlink', 'main.unlink']);
});
it.each([undefined, null, 17, Object.freeze(new Error('frozen cleanup'))].map((value, i) => ({ value, i })))(
  'F21 lone cleanup thrown-value identity $i', async ({ value }) => {
    await fixture(); hooks.faults.push({ phase: 'main.unlink', when: 'before', error: value });
    expect(await rejected(acquire())).toBe(value); expect(hooks.callbacks).toBe(1); expect(hooks.opens).toBe(1);
  });
it('ordinary typed and combined failures use the unchanged actual server serializer', async () => {
  // Extract only this function; importing the server would start real consumers.
  const source = await native.readFile(new URL('../../../src/server/index.ts', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('server.ts', source, ts.ScriptTarget.Latest, true);
  const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'error')!;
  expect(node).toBeDefined();
  const js = ts.transpileModule(node.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const logs: unknown[] = [], responses: Array<{ status: number; body: unknown }> = [];
  const serialize = new Function('json', 'console', js + ';return error;')(
    (_res: unknown, status: number, body: unknown) => responses.push({ status, body }), { error: (e: unknown) => logs.push(e) });
  await fixture(); const p = new ArtifactOwnerUnresolvedError(), c = fault('main.unlink');
  const combined = await rejected(acquire(async () => { throw p; })); aggregate(combined, [p, c], ['main.unlink']);
  serialize({}, p); serialize({}, combined);
  expect(responses[0]).toMatchObject({ status: 503, body: { code: 'source.owner-unresolved' } });
  expect(responses[1]).toEqual({ status: 500, body: { error: (combined as Error).message, code: undefined } });
  expect(logs[0]).toBe(p); expect(logs[1]).toBe(combined);
});
