import crypto from 'node:crypto';
import { cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DiscoveredApp } from '../shared/types.js';
import { appsDir } from './paths.js';
import { readJson, atomicWriteJson } from './json-files.js';
import { appendHistory } from './history.js';
import { getTemplate } from './templates.js';
import { spawnNpm } from './npm-process.js';

const REQUIRED = ['package.json', 'tsconfig.json', 'ui.app.json', 'app.settings.json', 'app-services.json', 'src/main.ts'];
const keyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function safeKey(key: string): string {
  if (!keyPattern.test(key)) throw new Error('Folder / URL Name must contain lowercase letters, numbers, and single hyphens only.');
  return key;
}

async function exists(file: string): Promise<boolean> {
  return stat(file).then(() => true).catch(() => false);
}

async function pagesFor(appDir: string): Promise<string[]> {
  const root = path.join(appDir, 'src', 'pages');
  const found: string[] = [];
  async function walk(dir: string, rel = ''): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      if (entry.name.startsWith('_')) continue;
      const childRel = path.join(rel, entry.name);
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), childRel);
      else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        let route = '/' + childRel.replaceAll('\\', '/').replace(/\.(ts|tsx)$/, '').replace(/\/index$/, '');
        if (route === '/index') route = '/';
        found.push(route);
      }
    }
  }
  await walk(root);
  return found.sort();
}

export async function getApp(keyInput: string): Promise<DiscoveredApp> {
  const key = safeKey(keyInput);
  const appDir = path.join(appsDir, key);
  const issues: string[] = [];
  for (const required of REQUIRED) if (!(await exists(path.join(appDir, required)))) issues.push(`Missing ${required}`);

  let manifest: any = {};
  let settings: any = {};
  let appServices: DiscoveredApp['appServices'] = null;
  try { manifest = await readJson(path.join(appDir, 'ui.app.json')); } catch { issues.push('Invalid ui.app.json'); }
  try { settings = await readJson(path.join(appDir, 'app.settings.json')); } catch { issues.push('Invalid app.settings.json'); }
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
    appServices,
  };
}

export async function discoverApps(): Promise<DiscoveredApp[]> {
  await mkdir(appsDir, { recursive: true });
  const entries = await readdir(appsDir, { withFileTypes: true });
  const result: DiscoveredApp[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    if (!keyPattern.test(entry.name)) continue;
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
      if (buffer.includes(0)) continue;
      let text = buffer.toString('utf8');
      for (const [key, value] of Object.entries(tokens)) text = text.replaceAll(`{{${key}}}`, value);
      await writeFile(full, text, 'utf8');
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

  await mkdir(appsDir, { recursive: true });
  try {
    await cp(path.join(folder, 'files'), tempDir, { recursive: true });
    await replaceTokens(tempDir, { APP_NAME: name, APP_KEY: key, APP_ID: appId, CREATED_AT: createdAt });
    await appendHistory(tempDir, { action: 'app.created', appId, appKey: key, template: definition.id, templateVersion: definition.version, actor: 'local-user' });

    for (const required of REQUIRED) {
      if (!(await exists(path.join(tempDir, required)))) throw new Error(`Template did not create required file: ${required}`);
    }

    // Automatic dependency installation is part of creation. It happens before commit/rename.
    await npmInstall(tempDir);
    await npmRun(tempDir, 'build:services');
    await rename(tempDir, finalDir);
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }

  return getApp(key);
}

export async function saveSettings(keyInput: string, settings: Record<string, unknown>): Promise<DiscoveredApp> {
  const key = safeKey(keyInput);
  const appDir = path.join(appsDir, key);
  const manifest = await readJson<any>(path.join(appDir, 'ui.app.json'));
  const status = (settings as any)?.application?.status;
  if (status !== 'active' && status !== 'disabled') throw new Error('application.status must be active or disabled.');
  await atomicWriteJson(path.join(appDir, 'app.settings.json'), settings);
  await appendHistory(appDir, { action: 'settings.updated', appId: manifest.appId, actor: 'local-user' });
  return getApp(key);
}

export function appPath(keyInput: string): string {
  return path.join(appsDir, safeKey(keyInput));
}
