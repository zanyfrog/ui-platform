import crypto from 'node:crypto';
import { cp, mkdir, readdir, readFile, rename, rm, stat, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import type { DiscoveredApp } from '../shared/types.js';
import { APP_MANIFEST_FILE, ensureAppManifest, writeInitialAppManifest } from './app-manifests.js';
import { appsDir, platformRoot, uiBasePackagesDir } from './paths.js';
import { readJson, atomicWriteJson } from './json-files.js';
import { appendHistory } from './history.js';
import { getTemplate } from './templates.js';
import { spawnNpm } from './npm-process.js';
import { rebaseApplicationLinks } from './application-links.js';
import { recordTemplateProvenance, substituteTemplate } from './template-updates.js';
import { withApplicationMutation } from './composition-lock.js';
import { VisualArtifactService } from './visual-artifacts.js';

const REQUIRED = ['package.json', 'tsconfig.json', APP_MANIFEST_FILE, 'app.settings.json', 'app-services.json', 'src/main.ts'];
const keyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const reservedAppKeys = new Set(['api', 'assets', 'node_modules', 'packages', 'src']);

function safeKey(key: string): string {
  if (!keyPattern.test(key)) throw new Error('Folder / URL Name must contain lowercase letters, numbers, and single hyphens only.');
  if (reservedAppKeys.has(key)) throw new Error('Folder / URL Name is reserved for a platform route.');
  return key;
}

async function exists(file: string): Promise<boolean> {
  return stat(file).then(() => true).catch(() => false);
}

async function pagesFor(appDir: string): Promise<string[]> {
  const root = path.join(appDir, 'src', 'pages');
  const found: string[] = [];
  const visualPages = await new VisualArtifactService(root, 'page').list();
  for (const bundle of visualPages) if (typeof bundle.metadata?.route === 'string') found.push(bundle.metadata.route);
  async function walk(dir: string, rel = ''): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    const visual = entries.some(entry => entry.name.endsWith('.visual.json'));
    for (const entry of entries) {
      if (entry.name.startsWith('_') || entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      const childRel = path.join(rel, entry.name);
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), childRel);
      else if (entry.isFile() && /(?<!\.functions)\.(ts|tsx)$/.test(entry.name)) {
        if (visual) continue;
        let route = '/' + childRel.replaceAll('\\', '/').replace(/\.(ts|tsx)$/, '').replace(/\/index$/, '');
        if (route === '/index') route = '/';
        found.push(route);
      }
    }
  }
  await walk(root);
  return [...new Set(found)].sort();
}
/** Admission needs only permanent ownership, never a recursive Visual read while
 * the target role lock is already held. Missing/unsafe owner source fails closed.
 */
export async function readApplicationOwnerId(key: string): Promise<string> {
  const directory = appPath(key);
  for (let ancestor = directory; ; ancestor = path.dirname(ancestor)) {
    if ((await lstat(ancestor)).isSymbolicLink()) throw new Error('Application ownership cannot use symbolic links.');
    if (path.dirname(ancestor) === ancestor) break;
  }
  const file = path.join(directory, APP_MANIFEST_FILE);
  if ((await lstat(file)).isSymbolicLink()) throw new Error('Application ownership cannot use symbolic links.');
  const owner = JSON.parse(await readFile(file, 'utf8')).appId;
  if (typeof owner !== 'string' || !owner) throw new Error('Original Application owner is unavailable.');
  return owner;
}

export async function getApp(keyInput: string): Promise<DiscoveredApp> {
  const key = safeKey(keyInput);
  const appDir = path.join(appsDir, key);
  const issues: string[] = [];

  let manifest: any = {};
  let settings: any = {};
  let settingsRevision: string | undefined;
  let appServices: DiscoveredApp['appServices'] = null;
  try { manifest = await ensureAppManifest(key); } catch {
    issues.push('Invalid app.manifest.json');
    try { manifest = await readJson(path.join(appDir, 'ui.app.json')); } catch { issues.push('Invalid ui.app.json'); }
  }

  for (const required of REQUIRED) if (!(await exists(path.join(appDir, required)))) issues.push(`Missing ${required}`);

  try { const text = await readFile(path.join(appDir, 'app.settings.json'), 'utf8'); settings = JSON.parse(text); settingsRevision = crypto.createHash('sha256').update(text).digest('hex'); } catch { issues.push('Invalid app.settings.json'); }
  try { appServices = await readJson(path.join(appDir, 'app-services.json')); } catch { appServices = null; }

  return {
    key,
    name: settings?.application?.name ?? key,
    appId: manifest?.appId ?? '',
    status: settings?.application?.status === 'disabled' ? 'disabled' : 'active',
    template: manifest?.template ?? 'unknown',
    templateVersion: manifest?.templateVersion ?? 'unknown',
    valid: issues.length === 0,
    issues,
    pages: await pagesFor(appDir),
    settings,
    settingsRevision,
    appServices,
  };
}

export async function discoverApps(): Promise<DiscoveredApp[]> {
  await mkdir(appsDir, { recursive: true });
  const entries = await readdir(appsDir, { withFileTypes: true });
  const result: DiscoveredApp[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    if (!keyPattern.test(entry.name) || reservedAppKeys.has(entry.name)) continue;
    result.push(await getApp(entry.name));
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

async function replaceTokens(root: string, tokens: Record<string, string>): Promise<void> {
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === 'template.json') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { await walk(full); continue; }
      const buffer = await readFile(full);
      await writeFile(full, substituteTemplate(buffer, full, tokens));
    }
  }
  await walk(root);
}

function npmInstall(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawnNpm(['install'], { cwd, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`npm install failed with exit code ${code}`)));
  });
}

function npmRun(cwd: string, script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawnNpm(['run', script], { cwd, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`npm run ${script} failed with exit code ${code}`)));
  });
}

export async function createApp(input: { name: string; key: string; templateId?: string }): Promise<DiscoveredApp> {
  const name = String(input.name ?? '').trim();
  const key = safeKey(String(input.key ?? '').trim());
  if (!name) throw new Error('Application Name is required.');
  const finalDir = path.join(appsDir, key);
  if (await exists(finalDir)) throw new Error(`Application folder already exists: ${key}`);

  const { definition, folder } = await getTemplate(input.templateId ?? 'standard');
  const tempDir = path.join(appsDir, `.creating-${key}-${crypto.randomUUID()}`);
  const appId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const creationTokens = { APP_NAME: name, APP_KEY: key, APP_ID: appId, CREATED_AT: createdAt,
    PLATFORM_PACKAGES: path.relative(finalDir, path.join(platformRoot, 'packages')).replaceAll('\\', '/'),
    UI_BASE_PACKAGES: path.relative(finalDir, uiBasePackagesDir).replaceAll('\\', '/') };

  await mkdir(appsDir, { recursive: true });
  try {
    await cp(path.join(folder, 'files'), tempDir, { recursive: true });
    await replaceTokens(tempDir, creationTokens);
    await writeInitialAppManifest(tempDir, { appId, template: definition.id, templateVersion: definition.version, createdAt });
    await recordTemplateProvenance(tempDir, path.join(folder, 'files'), definition.id, definition.version, creationTokens);
    await appendHistory(tempDir, { action: 'app.created', appId, appKey: key, template: definition.id, templateVersion: definition.version, actor: 'local-user' });

    for (const required of REQUIRED) {
      if (!(await exists(path.join(tempDir, required)))) throw new Error(`Template did not create required file: ${required}`);
    }

    // Automatic dependency installation is part of creation. It happens before commit/rename.
    await npmInstall(tempDir);
    await npmRun(tempDir, 'build:services');
    await rebaseApplicationLinks(path.join(tempDir, 'node_modules'), tempDir, finalDir);
    await rename(tempDir, finalDir);
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }

  return getApp(key);
}

export async function saveSettings(keyInput: string, settings: Record<string, unknown>, expectedHash?: string, admit: () => Promise<void> = async () => {}): Promise<DiscoveredApp> {
  const key = safeKey(keyInput);
  const appDir = path.join(appsDir, key);
  const manifest = await ensureAppManifest(key);
  const status = (settings as any)?.application?.status;
  if (status !== 'active' && status !== 'disabled') throw Object.assign(new Error('application.status must be active or disabled.'), { status: 422 });
  await withApplicationMutation(appDir, async () => {
    const file = path.join(appDir, 'app.settings.json'), original = await readFile(file, 'utf8');
    if (expectedHash && crypto.createHash('sha256').update(original).digest('hex') !== expectedHash) throw Object.assign(new Error('Application settings changed. Reload or recover before saving.'), { status: 409 });
    const current = JSON.parse(original);
    const next = current.presentation?.model === 'composition-v1' ? { ...settings, presentation: current.presentation } : settings;
    await admit();
    if (await readFile(file, 'utf8') !== original) throw Object.assign(new Error('Application settings changed during admission.'), { status: 409 });
    if (JSON.stringify(next) !== JSON.stringify(current)) await atomicWriteJson(file, next);
  });
  await appendHistory(appDir, { action: 'settings.updated', appId: manifest.appId, actor: 'local-user' });
  return getApp(key);
}

export function appPath(keyInput: string): string {
  return path.join(appsDir, safeKey(keyInput));
}
