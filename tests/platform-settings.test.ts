import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { PlatformSettingsAuthority } from '../src/server/platform-settings.js';
import { platformSettingsHandler } from '../src/server/platform-settings-http.js';
import { autosaveMilliseconds, defaultPlatformSettings } from '../src/shared/platform-settings.js';
import { configureAutosave } from '../src/client/artifact-editor/autosave-configuration.js';
import { EditingLifecycle } from '../src/client/artifact-editor/editing-lifecycle.js';

const cleanup: Array<() => Promise<unknown>> = [];
afterEach(async () => { vi.useRealTimers(); configureAutosave({ enabled: true, delayMs: 2000 }); for (const close of cleanup.splice(0).reverse()) await close(); });
async function authority() { const root = await mkdtemp(path.join(tmpdir(), 'wp5-e-settings-')); cleanup.push(() => rm(root, { recursive: true, force: true })); return new PlatformSettingsAuthority(root); }
it('defaults without creating a file, persists disabled preferences and reads them in a fresh authority', async () => {
  const store = await authority(); expect(await store.read()).toMatchObject({ source: 'default', revision: 'absent', settings: { editor: { autosave: { enabled: true, delayMs: 2000 } } } });
  await expect(readFile(store.file)).rejects.toThrow();
  const value = defaultPlatformSettings(); value.editor.autosave = { enabled: false, delayMs: 250 };
  const result = await store.update(value, 'absent', async () => {});
  expect(await new PlatformSettingsAuthority(store.root).read()).toEqual(result);
  expect(result.settings.editor.autosave).toEqual({ enabled: false, delayMs: 250 });
});
it('retains invalid configuration byte-for-byte and allows recovery only after the file is explicitly restored', async () => {
  const store = await authority(); const bytes = '{"version":99,"secret":"retained"}'; await writeFile(store.file, bytes);
  const value = await store.read(); expect(value.source).toBe('fallback'); expect(value.settings.editor.autosave.enabled).toBe(false); expect(value.problem).toContain('Automatic saves are disabled'); expect(value.problem).not.toContain('secret');
  await expect(store.update(defaultPlatformSettings(), value.revision, async () => {})).rejects.toMatchObject({ code: 'settings.recovery-required' });
  expect(await readFile(store.file, 'utf8')).toBe(bytes);
  await writeFile(store.file, JSON.stringify(defaultPlatformSettings())); expect((await store.read()).source).toBe('stored');
});
it('reports unreadable settings and never replaces them', async () => {
  const store = await authority(); const { mkdir } = await import('node:fs/promises'); await mkdir(store.file);
  const value = await store.read(); expect(value.source).toBe('fallback'); expect(value.settings.editor.autosave.enabled).toBe(false);
  await expect(store.update(defaultPlatformSettings(), value.revision, async () => {})).rejects.toMatchObject({ code: 'settings.recovery-required' });
});
it('serializes competing authority instances and rejects lost updates', async () => {
  const a = await authority(), b = new PlatformSettingsAuthority(a.root), value = defaultPlatformSettings();
  const outcomes = await Promise.allSettled([a.update(value, 'absent', async () => {}), b.update(value, 'absent', async () => {})]);
  expect(outcomes.filter(item => item.status === 'fulfilled')).toHaveLength(1);
  expect(outcomes.find(item => item.status === 'rejected')).toMatchObject({ reason: { code: 'settings.conflict' } });
});
it('rechecks admission under lock before writing', async () => {
  const store = await authority(), admit = vi.fn(async () => { if (admit.mock.calls.length === 2) throw new Error('Revoked'); });
  await expect(store.update(defaultPlatformSettings(), 'absent', admit)).rejects.toThrow('Revoked'); expect((await store.read()).source).toBe('default');
});
it('accepts exact hundredths and rejects invalid input without rounding', () => {
  for (const [text, milliseconds] of [['0.10', 100], ['0.25', 250], ['1.00', 1000], ['2.00', 2000], ['60.00', 60000]] as const) expect(autosaveMilliseconds(text)).toBe(milliseconds);
  for (const text of ['', 'NaN', 'Infinity', '0.09', '60.01', '0.101', '1.000', '1e0', '-1', ' 2.00 ']) expect(() => autosaveMilliseconds(text)).toThrow();
  for (const delayMs of [99, 101, 60001, 100.1, NaN, Infinity]) expect(() => configureAutosave({ enabled: true, delayMs })).toThrow();
});
it('restarts pending timers in multiple dirty copies and keeps Save Now independent when disabled', async () => {
  vi.useFakeTimers(); const saveA = vi.fn(async (v: string) => v), saveB = vi.fn(async (v: string) => v);
  const a = new EditingLifecycle('a', saveA), b = new EditingLifecycle('b', saveB);
  a.edit('a2'); b.edit('b2'); await vi.advanceTimersByTimeAsync(1500); configureAutosave({ enabled: true, delayMs: 100 });
  await vi.advanceTimersByTimeAsync(99); expect(saveA).not.toHaveBeenCalled(); expect(saveB).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1); expect(saveA).toHaveBeenCalledOnce(); expect(saveB).toHaveBeenCalledOnce();
  a.edit('a3'); b.edit('b3'); configureAutosave({ enabled: false, delayMs: 250 }); await vi.advanceTimersByTimeAsync(60000);
  expect(a.current).toBe('a3'); expect(a.dirty).toBe(true); expect(saveA).toHaveBeenCalledOnce();
  await a.flush(); expect(saveA).toHaveBeenCalledTimes(2); expect(b.dirty).toBe(true);
  configureAutosave({ enabled: true, delayMs: 250 }); await vi.advanceTimersByTimeAsync(249); expect(saveB).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(1); expect(saveB).toHaveBeenCalledTimes(2); await a.dispose(); await b.dispose();
});
it('retains admitted saves, edits during saves, undo, invalid drafts, conflicts and suspended copies', async () => {
  vi.useFakeTimers(); let complete!: (v: string) => void;
  const save = vi.fn(() => new Promise<string>(resolve => { complete = resolve; })), copy = new EditingLifecycle('a', save);
  copy.edit('b'); await vi.advanceTimersByTimeAsync(2000); expect(copy.state).toBe('saving');
  configureAutosave({ enabled: false, delayMs: 100 }); copy.edit('c'); complete('b'); await vi.advanceTimersByTimeAsync(60000);
  expect(copy.current).toBe('c'); expect(copy.baseline).toBe('b'); expect(save).toHaveBeenCalledOnce();
  copy.undo(); expect(copy.current).toBe('b'); copy.redo(); expect(copy.current).toBe('c');
  copy.conflict(); configureAutosave({ enabled: true, delayMs: 100 }); await vi.advanceTimersByTimeAsync(1000); expect(save).toHaveBeenCalledOnce();
  await copy.dispose();
  const invalidSave = vi.fn(async () => { throw Object.assign(new Error('Invalid'), { status: 422 }); });
  const invalid = new EditingLifecycle('valid', invalidSave); invalid.edit('bad'); await vi.advanceTimersByTimeAsync(100);
  configureAutosave({ enabled: true, delayMs: 250 }); await vi.advanceTimersByTimeAsync(1000); expect(invalidSave).toHaveBeenCalledOnce(); expect(invalid.current).toBe('bad');
  invalid.suspend(); configureAutosave({ enabled: true, delayMs: 100 }); await vi.advanceTimersByTimeAsync(1000); expect(invalidSave).toHaveBeenCalledOnce(); await invalid.dispose();
});
it('HTTP denies unauthorized readers/writers and propagates changes and revocation to multiple streams', async () => {
  const store = await authority(); let revoked = false;
  const handler = platformSettingsHandler(store, { async capture(req, mutation) {
    const role = req.headers['x-test-role']; if (!role || revoked || mutation && role !== 'admin') throw Object.assign(new Error('Denied'), { status: 403 });
    return { async assert() { if (revoked) throw Object.assign(new Error('Revoked'), { status: 403 }); }, async canModify() { return role === 'admin'; } };
  } });
  const server = createServer((req, res) => { void handler(req, res); }); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  cleanup.push(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/platform/settings`;
  expect((await fetch(url)).status).toBe(403); expect((await fetch(url, { method: 'PUT', headers: { 'x-test-role': 'editor' }, body: '{}' })).status).toBe(403);
  const streams = await Promise.all([1, 2].map(async () => {
    const response = await fetch(url + '/events', { headers: { 'x-test-role': 'editor' } }); return response.body!.getReader();
  }));
  for (const stream of streams) expect(new TextDecoder().decode((await stream.read()).value)).toContain('"source":"default"');
  const settings = defaultPlatformSettings(); settings.editor.autosave.enabled = false;
  const response = await fetch(url, { method: 'PUT', headers: { 'x-test-role': 'admin' }, body: JSON.stringify({ settings, expectedRevision: 'absent' }) }); expect(response.status).toBe(200);
  for (const stream of streams) expect(new TextDecoder().decode((await stream.read()).value)).toContain('"enabled":false');
  revoked = true;
  for (const stream of streams) { expect(new TextDecoder().decode((await stream.read()).value)).toContain('event: revoked'); await stream.cancel(); }
}, 10000);
