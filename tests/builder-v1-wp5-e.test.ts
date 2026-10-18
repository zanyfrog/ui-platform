import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { ProblemsValidation, captureProblemSources } from '../src/server/application-problems.js';
import { LatestProblems } from '../src/client/builder-workspace/problems.js';
import { savePageSource } from '../src/server/page-builder.js';
import { PlatformSettingsAuthority } from '../src/server/platform-settings.js';
import { defaultPlatformSettings } from '../src/shared/platform-settings.js';
import { EditingLifecycle } from '../src/client/artifact-editor/editing-lifecycle.js';
import { configureAutosave } from '../src/client/artifact-editor/autosave-configuration.js';
import { workspaceIdentityKey, type WorkspaceIdentity } from '../src/shared/builder-workspace.js';
import type { ProblemsReport } from '../src/shared/application-diagnostics.js';
const identity = (id: string): WorkspaceIdentity => ({ owner: { kind: 'application', id: 'one' }, format: 'generic', id });
const admission = () => ({ async assertAuthority() {}, async canRead() { return true; }, async revisionsCurrent() { return true; } });
const cleanup: Array<() => Promise<unknown>> = [];
afterEach(async () => { vi.useRealTimers(); configureAutosave({ enabled: true, delayMs: 2000 }); for (const close of cleanup.splice(0).reverse()) await close(); });
it('E5 rejects direct legacy source saves before any path access or rewrite', async () => {
  await expect(savePageSource('does-not-exist', 'src/pages/index.ts', 'replacement', 'hash')).rejects.toMatchObject({ status: 405, code: 'LEGACY_PAGE_READ_ONLY' });
  const text = await readFile('src/client/builder.ts', 'utf8'); expect(text).not.toContain('data-page-save'); expect(text).not.toContain('setTimeout'); expect(text).toContain('readonly>${esc(payload.source)}');
});
it('E1 independent malformed Menu/settings use native validators and do not short circuit each other', async () => {
  const records = ['menu', 'settings'].map(kind => ({ summary: { identity: { ...identity(kind), format: 'composition' as const }, applicationId: 'one', applicationKey: 'one', locator: kind === 'menu' ? 'menus/bad.json' : 'app.settings.json', group: 'Menus', kind, name: kind, editable: false }, async load() { return { source: { path: kind, content: '{bad', hash: kind } }; } }));
  const sources = await captureProblemSources(records, { pages: [], shells: [], components: [], packages: [] });
  const report = await new ProblemsValidation().validate(sources, sources.map(s => s.identity), admission());
  expect(report.diagnostics.some(d => d.code === 'composition.menu')).toBe(true); expect(report.diagnostics.some(d => d.code === 'composition.settings')).toBe(true); expect(report.status).toBe('incomplete');
  expect(report.source).toBe('authoritative-saved'); expect(Object.keys(report.revisions)).toHaveLength(2);
});
it('E3 refreshes changed and transitive dependents using native edges without revalidating unrelated sources', async () => {
  const cache = new ProblemsValidation(); const validators = [vi.fn(), vi.fn(), vi.fn()];
  const capture = (revision: string) => ['dataset', 'page', 'unrelated'].map((id, i) => ({ identity: identity(id), revision: i === 0 ? revision : '1', subsystem: 'generic', validate: async () => { validators[i](); return { complete: true, dependencies: i === 1 ? [identity('dataset')] : [], diagnostics: [{ severity: 'warning' as const, code: id, message: id, subsystem: 'generic' }] }; } }));
  let sources = capture('1'); await cache.validate(sources, sources.map(s => s.identity), admission());
  sources = capture('2'); const report = await cache.validate(sources, sources.map(s => s.identity), admission());
  expect(validators.map(v => v.mock.calls.length)).toEqual([2, 2, 1]); expect(report.diagnostics.map(d => d.code)).toContain('unrelated'); expect(report.refresh).toBe('incremental');
  expect(report.validated).toEqual([workspaceIdentityKey(identity('dataset')), workspaceIdentityKey(identity('page'))]);
  const full = await cache.validate(sources, sources.map(s => s.identity), admission(), true); expect(full.validated).toHaveLength(3);
});
it('E3 rejects stale revisions and revoked admission without leaking cached diagnostics', async () => {
  const cache = new ProblemsValidation(), source = { identity: identity('one'), revision: '1', subsystem: 'generic', async validate() { return { complete: true, dependencies: [], diagnostics: [{ severity: 'error' as const, code: 'private', message: 'private source', subsystem: 'generic' }] }; } };
  const report = await cache.validate([source], [source.identity], { ...admission(), async revisionsCurrent() { return false; } });
  expect(report.status).toBe('stale'); expect(report.diagnostics).toEqual([]); expect(report.revisions).toEqual({});
  await expect(cache.validate([source], [source.identity], { ...admission(), async assertAuthority() { throw new Error('Revoked'); } })).rejects.toThrow('Revoked');
});
it('E3 does not reuse a complete result when native graph capture becomes unavailable without source changes', async () => {
  const cache = new ProblemsValidation(); let available = true;
  const source = { identity: identity('settings'), revision: 'unchanged-settings', subsystem: 'composition', async validate() { return { complete: available, dependencies: [], diagnostics: [] }; } };
  expect((await cache.validate([source], [source.identity], admission(), false, 'available')).status).toBe('complete');
  available = false; expect((await cache.validate([source], [source.identity], admission(), false, 'unavailable')).status).toBe('incomplete');
  available = true; expect((await cache.validate([source], [source.identity], admission(), false, 'available')).status).toBe('complete');
});
it('E1 does not disclose denied identities or revisions through Problems metadata', async () => {
  const source = { identity: identity('private'), revision: 'private-revision', subsystem: 'generic', async validate() { throw new Error('Must not read'); } };
  const report = await new ProblemsValidation().validate([source], [source.identity], { ...admission(), async canRead() { return false; } });
  expect(report.revisions).toEqual({}); expect(report.validated).toEqual([]); expect(JSON.stringify(report)).not.toContain('private'); expect(report.status).toBe('incomplete');
});
it('E2/E3 client drops superseded success and failure responses', async () => {
  const latest = new LatestProblems(), apply = vi.fn(); let finish!: (r: ProblemsReport) => void;
  const report: ProblemsReport = { source: 'authoritative-saved', status: 'complete', diagnostics: [], reachable: [], blockers: [], publishable: false, revisions: {}, validated: [], refresh: 'full' };
  const slow = latest.refresh(() => new Promise(resolve => { finish = resolve; }), apply);
  await latest.refresh(async () => report, apply); finish(report); expect(await slow).toBe(false); expect(apply).toHaveBeenCalledOnce();
  let fail!: (e: Error) => void; const old = latest.refresh(() => new Promise((_, reject) => { fail = reject; }), apply); latest.invalidate(); fail(new Error('Old failure')); expect(await old).toBe(false);
});
it.each([100, 250, 1000, 2000, 60000])('E4–E7 exact inactivity interval %i ms', async delayMs => {
  vi.useFakeTimers(); configureAutosave({ enabled: true, delayMs }); const save = vi.fn(async (v: string) => v), copy = new EditingLifecycle('before', save);
  copy.edit('after'); await vi.advanceTimersByTimeAsync(delayMs - 1); expect(save).not.toHaveBeenCalled(); await vi.advanceTimersByTimeAsync(1); expect(save).toHaveBeenCalledOnce(); await copy.dispose();
});
it('E4 cross-process managed writers cannot lose an update and fresh processes retain disabled settings', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'wp5-e-process-')); cleanup.push(() => rm(root, { recursive: true, force: true, maxRetries: 10 }));
  const run = (mode: string) => new Promise<string>((resolve, reject) => {
    const code = `import { PlatformSettingsAuthority } from './src/server/platform-settings.ts'; import { defaultPlatformSettings } from './src/shared/platform-settings.ts'; const store = new PlatformSettingsAuthority(process.env.WP5_E_ROOT); try { if (process.env.WP5_E_MODE === 'write') { const value = defaultPlatformSettings(); value.editor.autosave.enabled = false; await store.update(value, 'absent', async () => { await new Promise(r => setTimeout(r, 150)); }); console.log('written'); } else console.log(JSON.stringify(await store.read())); } catch { console.log('rejected'); }`;
    const child: ChildProcess = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], { windowsHide: true, env: { ...process.env, WP5_E_ROOT: root, WP5_E_MODE: mode }, stdio: ['ignore', 'pipe', 'pipe'] }); let output = '', errors = '';
    child.stdout!.on('data', data => { output += data; }); child.stderr!.on('data', data => { errors += data; }); child.on('error', reject); child.on('exit', code => code === 0 ? resolve(output.trim()) : reject(new Error(errors)));
  });
  expect((await Promise.all([run('write'), run('write')])).sort()).toEqual(['rejected', 'written']);
  const fresh = JSON.parse(await run('read')); expect(fresh.settings.editor.autosave.enabled).toBe(false); expect(fresh.source).toBe('stored');
  expect((await new PlatformSettingsAuthority(root).read()).revision).toBe(fresh.revision);
}, 20000);
