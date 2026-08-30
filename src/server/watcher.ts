import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { appsDir, templatesDir, uiBasePackagesDir } from './paths.js';

export type ChangeListener = () => void;

async function signature(root: string): Promise<string> {
  const values: string[] = [];
  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 5) return;
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      if (['node_modules', 'dist', 'dist-server', '.git', '.vite'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full, depth + 1);
      else {
        const info = await stat(full).catch(() => null);
        if (info) values.push(`${full}:${info.mtimeMs}:${info.size}`);
      }
    }
  }
  await walk(root, 0);
  return values.sort().join('|');
}

export function startWorkspaceWatcher(listener: ChangeListener): () => void {
  let previous = '';
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const next = [await signature(appsDir), await signature(templatesDir), await signature(uiBasePackagesDir)].join('::');
      if (previous && next !== previous) listener();
      previous = next;
    } finally { running = false; }
  };
  void tick();
  const timer = setInterval(() => void tick(), 1500);
  return () => clearInterval(timer);
}
