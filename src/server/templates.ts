import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { TemplateDefinition } from '../shared/types.js';
import { templatesDir } from './paths.js';

export async function discoverTemplates(): Promise<TemplateDefinition[]> {
  const entries = await readdir(templatesDir, { withFileTypes: true }).catch(() => []);
  const templates: TemplateDefinition[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifest = path.join(templatesDir, entry.name, 'template.json');
    try {
      const parsed = JSON.parse(await readFile(manifest, 'utf8')) as TemplateDefinition;
      if (parsed.id && parsed.name && parsed.version && Array.isArray(parsed.settings)) templates.push(parsed);
    } catch {
      // Invalid templates are ignored by discovery; validation tooling can surface them later.
    }
  }
  return templates.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTemplate(id: string): Promise<{ definition: TemplateDefinition; folder: string }> {
  const templates = await discoverTemplates();
  const definition = templates.find((item) => item.id === id);
  if (!definition) throw new Error(`Unknown template: ${id}`);
  return { definition, folder: path.join(templatesDir, id) };
}
