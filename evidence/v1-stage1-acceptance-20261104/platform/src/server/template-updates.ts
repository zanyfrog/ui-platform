import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { atomicWriteJson, atomicWriteText } from './json-files.js';
import { withApplicationMutation } from './composition-lock.js';
import { prepareVisualSourcePlan, partialSourceOperation } from './visual-source-plan.js';
import type { PackageComponent } from '@ui-platform/visual-artifacts';
import { compositionSourceFiles } from './composition-snapshots.js';

const digest = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const provenanceFile = 'template.provenance.json';
export interface TemplateProvenance {
  templateId: string; templateAppliedVersion: string;
  files: Record<string, { checksum: string; version: string }>;
  tokens: Record<string, string>;
}
export interface TemplateComparison {
  templateId: string; version: string; expectedHash: string;
  items: Array<{ path: string; category: 'new' | 'different' | 'unchanged' | 'application-only' | 'removed'; applicationHash: string | null; templateHash: string | null }>;
}
async function sourceTree(root: string): Promise<Map<string, Buffer>> {
  const result = new Map<string, Buffer>();
  const coordinated = await compositionSourceFiles(root);
  const walk = async (dir: string, prefix = '') => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (['node_modules', 'dist', 'dist-server', '.git', '.vite', '.uib', 'presentation'].includes(entry.name)) continue;
      if (entry.isSymbolicLink()) throw new Error('Template comparison does not follow symbolic links.');
      const relative = prefix + entry.name;
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), relative + '/');
      else if (entry.isFile() && relative !== provenanceFile) result.set(relative, coordinated.get(relative) ?? await readFile(path.join(dir, entry.name)));
    }
  };
  await walk(root); return result;
}
export function substituteTemplate(content: Buffer, file: string, tokens: Record<string, string>): Buffer {
  if (/\.(?:png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|zip)$/i.test(file)) return content;
  if (content.includes(0)) return content;
  // Binary assets must survive byte-for-byte even when they contain no NUL byte.
  const decoded = content.toString('utf8');
  if (!Buffer.from(decoded).equals(content)) return content;
  let text = decoded;
  for (const [key, value] of Object.entries(tokens)) text = text.replaceAll(`{{${key}}}`, () => file.endsWith('.json') ? JSON.stringify(value).slice(1, -1) : value);
  return Buffer.from(text);
}
export async function recordTemplateProvenance(appRoot: string, templateRoot: string, templateId: string, version: string, tokens: Record<string, string>): Promise<void> {
  const tree = await sourceTree(templateRoot);
  await atomicWriteJson(path.join(appRoot, provenanceFile), { templateId, templateAppliedVersion: version, tokens,
    files: Object.fromEntries([...tree].map(([file, content]) => [file, { checksum: digest(content), version }])) } satisfies TemplateProvenance);
  await recordProcessedVersion(appRoot, version);
}
async function recordProcessedVersion(appRoot: string, version: string): Promise<void> {
  const file = path.join(appRoot, 'app.manifest.json');
  const text = await readFile(file, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (text) await atomicWriteJson(file, { ...JSON.parse(text), templateAppliedVersion: version, templateProvenance: provenanceFile });
}
async function comparison(appRoot: string, templateRoot: string, templateId: string, version: string) {
  const raw = await readFile(path.join(appRoot, provenanceFile), 'utf8');
  const provenance = JSON.parse(raw) as TemplateProvenance;
  if (provenance.templateId !== templateId) throw new Error('Application template origin does not match.');
  const [application, template] = await Promise.all([sourceTree(appRoot), sourceTree(templateRoot)]);
  const items: TemplateComparison['items'] = [];
  for (const file of [...new Set([...application.keys(), ...template.keys(), ...Object.keys(provenance.files)])].sort()) {
    const app = application.get(file), current = template.get(file);
    const applicationHash = app ? digest(app) : null, templateHash = current ? digest(current) : null;
    const category = !current ? (provenance.files[file] ? 'removed' : 'application-only') : !app ? 'new' : app.equals(substituteTemplate(current, file, provenance.tokens)) ? 'unchanged' : 'different';
    items.push({ path: file, category, applicationHash, templateHash });
  }
  const plan: TemplateComparison = { templateId, version, items, expectedHash: digest(JSON.stringify({ raw, templateId, version, items })) };
  return { plan, provenance, template };
}
export async function compareTemplate(appRoot: string, templateRoot: string, templateId: string, version: string): Promise<TemplateComparison> {
  return (await comparison(appRoot, templateRoot, templateId, version)).plan;
}
export async function applyTemplateUpdate(appRoot: string, templateRoot: string, templateId: string, version: string, expectedHash: string, decisions: Record<string, 'add' | 'keep' | 'replace'>, options: { packages?: PackageComponent[]; admit?: () => Promise<void> } = {}): Promise<TemplateComparison> {
  return withApplicationMutation(appRoot, async () => {
    const { plan, provenance, template } = await comparison(appRoot, templateRoot, templateId, version);
    if (!expectedHash || plan.expectedHash !== expectedHash) throw new Error('Application or template changed. Reload the comparison before updating.');
    for (const key of Object.keys(decisions)) if (!plan.items.some(item => item.path === key && ['new', 'different'].includes(item.category))) throw new Error('Unknown or non-selectable template item.');
    for (const item of plan.items) {
      const decision = decisions[item.path];
      if (item.category === 'different' && !['keep', 'replace'].includes(decision)) throw new Error(`Choose Keep or Replace for ${item.path}.`);
      if (item.category === 'new' && !['keep', 'add'].includes(decision)) throw new Error(`Choose Add or Keep for ${item.path}.`);
      if (['app.manifest.json', 'ui.app.json'].includes(item.path) && ['replace', 'add'].includes(decision)) throw new Error('Application identity files must be kept.');
    }
    const changes = new Map(plan.items.filter(item => ['add', 'replace'].includes(decisions[item.path])).map(item => [item.path, substituteTemplate(template.get(item.path)!, item.path, provenance.tokens)]));
    const visual = await prepareVisualSourcePlan(appRoot, changes, options.packages);
    await options.admit?.();
    if ((await comparison(appRoot, templateRoot, templateId, version)).plan.expectedHash !== expectedHash) throw new Error('Application or template changed during operation admission.');
    const committed = await visual.commit(options.admit);
    try {
    // Complete Visual candidates were validated and journaled before these
    // ordinary files. This explicit operation has no cross-artifact Undo.
    for (const item of plan.items) if (['add', 'replace'].includes(decisions[item.path])) {
      if (visual.managedPaths.has(item.path)) continue;
      const content = substituteTemplate(template.get(item.path)!, item.path, provenance.tokens);
      const target = path.join(appRoot, item.path);
      // Tree inventory above rejects symlinks; recheck the destination before mutation.
      const info = await lstat(target).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (info?.isSymbolicLink()) throw new Error('Template destination is a symbolic link.');
      if (Buffer.from(content.toString('utf8')).equals(content)) await atomicWriteText(target, content.toString('utf8'));
      else {
        const { mkdir, writeFile, rename } = await import('node:fs/promises');
        await mkdir(path.dirname(target), { recursive: true });
        const temporary = target + '.template-update'; await writeFile(temporary, content); await rename(temporary, target);
      }
      committed.push(item.path);
    }
    // Retain historical paths so omissions remain identifiable on later comparisons.
    for (const [file, content] of template) provenance.files[file] = { checksum: digest(content), version };
    provenance.templateAppliedVersion = version;
    await atomicWriteJson(path.join(appRoot, provenanceFile), provenance);
    await recordProcessedVersion(appRoot, version);
    } catch (error) { if (committed.length) throw partialSourceOperation(error, committed); throw error; }
    return compareTemplate(appRoot, templateRoot, templateId, version);
  });
}
