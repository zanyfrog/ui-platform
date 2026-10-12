import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { automationDiagnostics, type AutomationBundle, type AutomationDefinition } from '../shared/automation.js';
import { atomicWriteText } from './json-files.js';
import { moveToOsTrash } from './trash.js';
const hash = (source: string) => createHash('sha256').update(source).digest('hex');
const locks = new Map<string, Promise<unknown>>();
/** Source files are the only definition store. Reads always observe disk. */
export class AutomationStore {
  constructor(readonly root: string, readonly kind: 'trigger' | 'workflow') {}
  private async file(locator: string, create = false) {
    if (!new RegExp(`^[a-z][a-z0-9-]*/${this.kind}\\.json$`).test(locator)) throw new Error('Invalid automation locator.');
    if (create) await mkdir(this.root, { recursive: true });
    const resolved = path.resolve(this.root);
    for (let ancestor = resolved; ; ancestor = path.dirname(ancestor)) {
      if ((await lstat(ancestor).catch(e => { if (e.code === 'ENOENT') return null; throw e; }))?.isSymbolicLink()) throw new Error('Symlinks are not supported.');
      if (ancestor === path.dirname(ancestor)) break;
    }
    const base = await realpath(resolved); let current = base;
    for (const segment of locator.split('/')) {
      current = path.join(current, segment);
      if ((await lstat(current).catch(e => { if (e.code === 'ENOENT') return null; throw e; }))?.isSymbolicLink()) throw new Error('Symlinks are not supported.');
    }
    return current;
  }
  async read(locator: string): Promise<AutomationBundle> {
    const source = await readFile(await this.file(locator), 'utf8'); let definition: AutomationDefinition | undefined;
    let diagnostics: string[];
    try { definition = JSON.parse(source); diagnostics = automationDiagnostics(definition); } catch { diagnostics = ['Invalid JSON.']; }
    if (definition?.kind !== this.kind) diagnostics.push(`Expected ${this.kind}.`);
    return { locator, source, hash: hash(source), definition, diagnostics };
  }
  async list(): Promise<AutomationBundle[]> {
    const entries = await readdir(this.root, { withFileTypes: true }).catch(e => { if (e.code === 'ENOENT') return []; throw e; });
    const bundles: AutomationBundle[] = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) if (entry.isDirectory() && /^[a-z][a-z0-9-]*$/.test(entry.name)) {
      const locator = `${entry.name}/${this.kind}.json`;
      try { bundles.push(await this.read(locator)); } catch (error) { bundles.push({ locator, source: '', hash: '', diagnostics: [String(error)] }); }
    }
    for (const b of bundles) if (b.definition?.id && bundles.filter(x => x.definition?.id === b.definition?.id).length > 1) b.diagnostics.push('Duplicate permanent identity.');
    return bundles;
  }
  async create(name: string, input: Omit<AutomationDefinition, 'id' | 'kind' | 'schemaVersion' | 'name'>) {
    const locator = `${name}/${this.kind}.json`, file = await this.file(locator, true);
    const definition: AutomationDefinition = { ...input, schemaVersion: 1, kind: this.kind, id: `${this.kind}_${randomUUID()}`, name };
    const errors = automationDiagnostics(definition); if (errors.length) throw new Error(errors.join(' '));
    await mkdir(path.dirname(file));
    await atomicWriteText(file, JSON.stringify(definition, null, 2) + '\n'); return this.read(locator);
  }
  private async locked<T>(locator: string, action: () => Promise<T>): Promise<T> {
    const key = `${this.root}/${locator}`, prior = locks.get(key) ?? Promise.resolve();
    const next = prior.catch(() => {}).then(action); locks.set(key, next);
    try { return await next; } finally { if (locks.get(key) === next) locks.delete(key); }
  }
  async save(locator: string, source: string, expectedHash: string) {
    return this.locked(locator, async () => {
      const previous = await this.read(locator);
      if (!expectedHash || previous.hash !== expectedHash) throw new Error('Source changed on disk. Reload before saving.');
      const incoming = JSON.parse(source) as AutomationDefinition;
      if (incoming.id !== previous.definition?.id || incoming.kind !== this.kind) throw new Error('Permanent identity and kind are immutable.');
      const errors = automationDiagnostics(incoming); if (errors.length) throw new Error(errors.join(' '));
      await atomicWriteText(await this.file(locator), source); return this.read(locator);
    });
  }
  async remove(locator: string, expectedHash: string, references: Array<{ name: string; source: string }>) {
    return this.locked(locator, async () => {
      const current = await this.read(locator);
      if (!expectedHash || current.hash !== expectedHash) throw new Error('Source changed. Reload before deletion.');
      const id = current.definition?.id;
      const used = id ? references.filter(r => r.source.includes(id)) : [];
      if (used.length) throw new Error(`Referenced by: ${used.map(r => r.name).join(', ')}.`);
      await moveToOsTrash(path.dirname(await this.file(locator)));
    });
  }
}
