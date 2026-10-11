import { describe, expect, it } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { discoverTemplates, getTemplate } from '../src/server/templates.js';

describe('bundled application template', () => {
  it('discovers the default template and includes creation, build, and preview artifacts', async () => {
    expect((await discoverTemplates()).some(item => item.id === 'standard')).toBe(true);
    const { folder } = await getTemplate('standard');
    for (const file of ['package.json', 'tsconfig.json', 'app.settings.json', 'app-services.json', 'src/main.ts', 'src/pages/index.ts', 'index.html', 'vite.config.js', 'scripts/dev.mjs', 'packages/app-services/package.json', 'packages/app-services/build.mjs', 'packages/app-services/src/index.js']) {
      expect((await stat(path.join(folder, 'files', file))).isFile(), file).toBe(true);
    }
    const pkg = JSON.parse(await readFile(path.join(folder, 'files/package.json'), 'utf8'));
    for (const script of ['dev', 'build', 'build:services', 'start', 'typecheck', 'test']) expect(pkg.scripts[script]).toBeTruthy();
  });
});
