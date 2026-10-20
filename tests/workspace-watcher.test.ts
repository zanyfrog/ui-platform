import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  apps: 'C:\\WP5F Mixed\\Apps', templates: 'C:\\WP5F Mixed\\Templates',
  packages: 'C:\\WP5F Mixed\\Packages', components: 'C:\\WP5F Mixed\\Components',
  directories: new Map<string, { name: string; directory: boolean }[]>(),
  files: new Map<string, { mtimeMs: number; size: number }>(),
  reads: [] as string[], stats: [] as string[],
}));
vi.mock('../src/server/paths.js', () => ({ appsDir: fixture.apps, templatesDir: fixture.templates, uiBasePackagesDir: fixture.packages }));
vi.mock('../src/server/visual-artifacts.js', () => ({ platformComponentsRoot: fixture.components }));
vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(async (dir: string) => {
    fixture.reads.push(path.normalize(dir));
    return (fixture.directories.get(path.normalize(dir)) ?? []).map(entry => ({ name: entry.name, isDirectory: () => entry.directory }));
  }),
  stat: vi.fn(async (file: string) => {
    fixture.stats.push(path.normalize(file));
    const info = fixture.files.get(path.normalize(file));
    if (!info) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    return info;
  }),
}));
import { startWorkspaceWatcher } from '../src/server/watcher.js';

let stop: (() => void) | undefined;
function directory(root: string, ...entries: { name: string; directory: boolean }[]) { fixture.directories.set(path.normalize(root), entries); }
const folder = (name: string) => ({ name, directory: true });
const file = (name: string) => ({ name, directory: false });
function source(root: string, name: string, mtimeMs = 1) { fixture.files.set(path.join(root, name), { mtimeMs, size: 10 }); }
const tick = () => vi.advanceTimersByTimeAsync(1500);
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => {
  stop?.(); stop = undefined; vi.useRealTimers();
  fixture.directories.clear(); fixture.files.clear(); fixture.reads.length = 0; fixture.stats.length = 0;
});

it('never reads or stats descendants of unpublished Application staging directories', async () => {
  const staged = path.join(fixture.apps, '.creating-draft-uuid');
  const published = path.join(fixture.apps, 'published');
  directory(fixture.apps, folder('.creating-draft-uuid'), folder('published'));
  directory(staged, file('app.manifest.json'), folder('shells'));
  directory(path.join(staged, 'shells'), file('shell.html'));
  directory(published, file('app.manifest.json'));
  source(staged, 'app.manifest.json'); source(path.join(staged, 'shells'), 'shell.html'); source(published, 'app.manifest.json');
  stop = startWorkspaceWatcher(vi.fn()); await vi.advanceTimersByTimeAsync(0);
  expect(fixture.reads).not.toContain(staged);
  expect(fixture.stats.filter(name => name.startsWith(staged + path.sep))).toEqual([]);
  expect(fixture.stats).toContain(path.join(published, 'app.manifest.json'));
});

it('detects atomic publication on the next ordinary scan and subsequent published edits', async () => {
  const staged = path.join(fixture.apps, '.creating-new-uuid'), published = path.join(fixture.apps, 'new');
  directory(fixture.apps, folder('.creating-new-uuid'), folder('existing'));
  directory(path.join(fixture.apps, 'existing'), file('app.manifest.json')); source(path.join(fixture.apps, 'existing'), 'app.manifest.json');
  directory(staged, file('app.manifest.json')); source(staged, 'app.manifest.json');
  const changed = vi.fn(); stop = startWorkspaceWatcher(changed); await vi.advanceTimersByTimeAsync(0);
  source(staged, 'app.manifest.json', 2); await tick(); expect(changed).not.toHaveBeenCalled();
  // The directory entry switch represents the one atomic rename, without an intermediate published tree.
  directory(fixture.apps, folder('new'), folder('existing'));
  directory(published, file('app.manifest.json')); source(published, 'app.manifest.json', 2);
  await tick(); expect(changed).toHaveBeenCalledTimes(1);
  expect(fixture.stats).toContain(path.join(published, 'app.manifest.json'));
  source(published, 'app.manifest.json', 3); await tick(); expect(changed).toHaveBeenCalledTimes(2);
});

it('ignores failure cleanup and abandoned staging edits while retaining published recovery notifications', async () => {
  const existing = path.join(fixture.apps, 'existing'), abandoned = path.join(fixture.apps, '.creating-abandoned-uuid');
  directory(fixture.apps, folder('existing')); directory(existing, file('app.manifest.json')); source(existing, 'app.manifest.json');
  const changed = vi.fn(); stop = startWorkspaceWatcher(changed); await vi.advanceTimersByTimeAsync(0);
  directory(fixture.apps, folder('existing'), folder('.creating-abandoned-uuid')); directory(abandoned, file('app.manifest.json')); source(abandoned, 'app.manifest.json');
  await tick(); source(abandoned, 'app.manifest.json', 5); await tick();
  directory(fixture.apps, folder('existing')); await tick(); expect(changed).not.toHaveBeenCalled();
  source(existing, 'app.manifest.json', 6); await tick(); expect(changed).toHaveBeenCalledTimes(1);
  expect(fixture.stats).not.toContain(path.join(abandoned, 'app.manifest.json'));
});

it('preserves legitimate dot paths, nested staging-like names and other workspace roots', async () => {
  const app = path.join(fixture.apps, 'published'), nested = path.join(app, '.creating-content');
  directory(fixture.apps, folder('published'), folder('.workspace-notes'), file('.creating-notes'));
  directory(app, file('.env'), folder('.creating-content')); source(app, '.env');
  directory(nested, file('asset.css')); source(nested, 'asset.css');
  directory(path.join(fixture.apps, '.workspace-notes'), file('notes.txt')); source(path.join(fixture.apps, '.workspace-notes'), 'notes.txt'); source(fixture.apps, '.creating-notes');
  for (const root of [fixture.templates, fixture.packages, fixture.components]) {
    directory(root, folder('.creating-reference')); directory(path.join(root, '.creating-reference'), file('source.txt')); source(path.join(root, '.creating-reference'), 'source.txt');
  }
  stop = startWorkspaceWatcher(vi.fn()); await vi.advanceTimersByTimeAsync(0);
  for (const expected of [path.join(app, '.env'), path.join(nested, 'asset.css'), path.join(fixture.apps, '.workspace-notes/notes.txt'), path.join(fixture.apps, '.creating-notes'), ...[fixture.templates, fixture.packages, fixture.components].map(root => path.join(root, '.creating-reference/source.txt'))]) expect(fixture.stats).toContain(expected);
});

it('treats mixed-case Windows staging directory names as unpublished without prefix overmatching', async () => {
  directory(fixture.apps, folder('.CREATING-Draft-UUID'), folder('.Creating-other'), folder('.creating'), folder('creating-live'));
  for (const name of ['.CREATING-Draft-UUID', '.Creating-other', '.creating', 'creating-live']) {
    directory(path.join(fixture.apps, name), file('source.txt')); source(path.join(fixture.apps, name), 'source.txt');
  }
  stop = startWorkspaceWatcher(vi.fn()); await vi.advanceTimersByTimeAsync(0);
  expect(fixture.reads).not.toContain(path.join(fixture.apps, '.CREATING-Draft-UUID'));
  expect(fixture.reads).not.toContain(path.join(fixture.apps, '.Creating-other'));
  expect(fixture.stats).toContain(path.join(fixture.apps, '.creating/source.txt'));
  expect(fixture.stats).toContain(path.join(fixture.apps, 'creating-live/source.txt'));
});
