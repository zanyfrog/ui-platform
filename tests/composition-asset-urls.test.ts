import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'vite';
import { revisionApplicationComposition } from '../packages/visual-artifacts/src/revision-composition-vite.js';
import { validateManagedUrlAttribute } from '../packages/visual-artifacts/src/source.js';
import { VisualArtifactService } from '../src/server/visual-artifacts.js';

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

it('emits a byte-identical small composition logo through an allowed URL instead of inlining it', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'composition-assets-')); roots.push(root);
  const snapshot = path.join(root, 'presentation/versions/v1/composition');
  const logo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0h1v1z"/></svg>';
  for (const dir of [root, snapshot]) {
    await mkdir(path.join(dir, 'assets/branding'), { recursive: true });
    await writeFile(path.join(dir, 'assets/branding/logo.svg'), logo);
    await writeFile(path.join(dir, 'assets/branding/.brand.svg'), logo.replace('<svg ', '<svg id="legitimate-hidden-asset" '));
    for (const folder of ['documents', 'icons', 'images']) {
      await mkdir(path.join(dir, 'assets', folder));
      await writeFile(path.join(dir, 'assets', folder, '.gitkeep'), '\n');
    }
    const shell = await new VisualArtifactService(path.join(dir, 'shells'), 'shell').create('public');
    await writeFile(path.join(dir, 'app.settings.json'), JSON.stringify({ presentation: { defaultShellId: shell.metadata!.artifactId, assetsRoot: 'assets', branding: { applicationName: 'Asset fixture' }, siteStyles: [], theme: {} } }));
  }
  await writeFile(path.join(root, 'package.json'), '{}');
  await writeFile(path.join(root, 'presentation/presentation.manifest.json'), '{"activeVersion":1}');
  await writeFile(path.join(root, 'assets/branding/logo.svg'), logo.replace('<svg ', '<svg id="authoring-only" '));
  const compile = async (command: 'build' | 'serve') => {
    const plugin = revisionApplicationComposition({ root });
    (plugin.configResolved as Function)({ command });
    return (plugin.load as Function).call({ addWatchFile() {} }, '\0virtual:uip-application-composition') as Promise<string>;
  };
  const production = await compile('build');
  const requests = [...production.matchAll(/import asset\d+ from ("[^"]+")/g)].map(match => JSON.parse(match[1]));
  const request = requests.find(request => request.endsWith('/logo.svg?url&no-inline'))!;
  expect(request).toContain('/presentation/versions/v1/composition/assets/branding/logo.svg?url&no-inline');
  const development = await compile('serve');
  expect(development).toContain('assets/branding/logo.svg?url&no-inline');
  for (const compiled of [production, development]) {
    expect(compiled).not.toContain('.gitkeep');
    expect(compiled).toMatch(/"assets\/branding\/\.brand\.svg":\s*asset/);
    expect(compiled).toMatch(/"assets\/branding\/logo\.svg":\s*asset/);
  }
  expect(requests).toHaveLength(2);
  // Exercise the installed Vite asset pipeline, retaining output in memory only.
  const result = await build({ configFile: false, root, logLevel: 'silent', plugins: [{ name: 'asset-entry', resolveId(id) { if (id === 'asset-entry') return '\0asset-entry'; }, load(id) { if (id === '\0asset-entry') return requests.map((request, index) => `import asset${index} from ${JSON.stringify(request)}; console.log(asset${index});`).join('\n'); } }], build: { write: false, minify: false, rollupOptions: { input: 'asset-entry' } } });
  const output = (Array.isArray(result) ? result[0] : result as any).output;
  const asset = output.find((item: any) => item.type === 'asset' && Buffer.from(item.source).toString() === logo);
  expect(output.filter((item: any) => item.type === 'asset')).toHaveLength(2);
  expect(output.some((item: any) => item.fileName.includes('.gitkeep'))).toBe(false);
  expect(asset).toBeDefined();
  expect(Buffer.from(asset.source).toString()).toBe(logo);
  const code = output.find((item: any) => item.type === 'chunk').code;
  expect(code).toContain('/' + asset.fileName);
  expect(code).not.toContain('data:image');
  expect(() => validateManagedUrlAttribute('img', 'src', '/' + asset.fileName)).not.toThrow();
  expect(await readFile(path.join(snapshot, 'assets/branding/logo.svg'), 'utf8')).toBe(logo);
});

it.each(['data:image/svg+xml,%3Csvg/%3E', 'javascript:alert(1)', 'blob:https://example.com/id', '//example.com/logo.svg', 'assets\\logo.svg'])('retains rejection of unsafe image URL %s', value => {
  expect(() => validateManagedUrlAttribute('img', 'src', value)).toThrow('Unsupported or malformed img src URL');
});
