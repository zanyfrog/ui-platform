import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { TemplateDefinition } from '../shared/types.js';
import { platformRoot, templatesDir } from './paths.js';

const bundledTemplatesDir = path.join(platformRoot, 'templates');

async function templateFolders(): Promise<Map<string, { definition: TemplateDefinition; folder: string }>> {
  const found = new Map<string, { definition: TemplateDefinition; folder: string }>();
  for (const root of [bundledTemplatesDir, templatesDir]) {
    const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const folder = path.join(root, entry.name);
      try {
        const definition = JSON.parse(await readFile(path.join(folder, 'template.json'), 'utf8')) as TemplateDefinition;
        if (definition.id && definition.name && definition.version && Array.isArray(definition.settings)) {
          found.set(definition.id, { definition, folder });
        }
      } catch { /* Ignore invalid template manifests. */ }
    }
  }
  return found;
}

export async function discoverTemplates(): Promise<TemplateDefinition[]> {
  const templates = [...(await templateFolders()).values()].map(({ definition }) => definition);
  return templates.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTemplate(id: string): Promise<{ definition: TemplateDefinition; folder: string }> {
  const template = (await templateFolders()).get(id);
  if (!template) throw new Error(`Unknown template: ${id}`);
  return template;
}
