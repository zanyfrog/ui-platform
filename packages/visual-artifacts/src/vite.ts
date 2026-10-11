import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Plugin } from 'vite';
import { validateArtifact } from './validation.js';
import type { PackageComponent, RuntimeArtifact } from './model.js';

/** Discovery is a build-time source import, not a generated runtime artifact or HTTP dependency. */
export function visualArtifacts(options: { componentsRoot: string; packageManifests: string[] }): Plugin {
  const virtualId = 'virtual:uip-visual-artifacts';
  return {
    name: 'ui-platform-visual-artifacts',
    resolveId(id) { if (id === virtualId) return `\0${virtualId}`; },
    async load(id) {
      if (id !== `\0${virtualId}`) return;
      const imports: string[] = [], components: string[] = [], packages: string[] = [];
      const sourceComponents: RuntimeArtifact[] = [], sourcePackages: PackageComponent[] = [];
      const walk = async (dir: string) => {
        for (const item of await readdir(dir, { withFileTypes: true })) {
          if (item.name.startsWith('.') || item.isSymbolicLink()) continue;
          const file = path.join(dir, item.name);
          if (item.isDirectory()) await walk(file);
          else if (item.name.endsWith('.visual.json')) {
            const metadata = JSON.parse(await readFile(file, 'utf8'));
            if (metadata.kind !== 'component') throw new Error(`Only Components belong in ${options.componentsRoot}.`);
            this.addWatchFile(file);
            const stem = file.slice(0, -'.visual.json'.length).replaceAll('\\', '/'), index = components.length;
            const optional = async (extension: string, declaration: string, fallback: string) => {
              try { await readFile(stem + extension); imports.push(declaration); }
              catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; imports.push(fallback); }
            };
            imports.push(`import m${index} from ${JSON.stringify(file.replaceAll('\\', '/'))}; import s${index} from ${JSON.stringify(stem + '.html?raw')};`);
            await optional('.css', `import c${index} from ${JSON.stringify(stem + '.css?raw')};`, `const c${index}="";`);
            await optional('.functions.ts', `import * as f${index} from ${JSON.stringify(stem + '.functions.ts')};`, `const f${index}={};`);
            sourceComponents.push({ metadata, source: await readFile(stem + '.html', 'utf8'), css: await readFile(stem + '.css', 'utf8').catch(() => '') });
            components.push(`{metadata:m${index},source:s${index},css:c${index},functions:f${index}}`);
          }
        }
      };
      await walk(options.componentsRoot);
      for (const file of options.packageManifests) {
        this.addWatchFile(file);
        const manifest = JSON.parse(await readFile(file, 'utf8'));
        const packageJson = JSON.parse(await readFile(path.join(path.dirname(file), 'package.json'), 'utf8'));
        const require = createRequire(path.join(path.dirname(file), 'package.json'));
        for (const entry of manifest.components ?? []) {
          if (!entry.module) continue;
          const module = path.resolve(path.dirname(file), entry.module).replaceAll('\\', '/');
          // Resolve the package's real module; Vite compiles it with the application's normal dependency graph.
          require.resolve(module);
          imports.push(`import ${JSON.stringify(module)};`);
          const pkg = { ...entry, id: entry.identity?.componentId ?? entry.id ?? `${packageJson.name}:${entry.tagName}`, definition: entry.identity ? entry : undefined };
          packages.push(JSON.stringify(pkg)); sourcePackages.push(pkg);
        }
      }
      const seen = new Set<string>();
      for (const component of sourceComponents) {
        const id = component.metadata.componentId!; if (seen.has(id)) throw new Error(`Duplicate Component identity: ${id}.`); seen.add(id);
        const errors = validateArtifact(component, sourceComponents, sourcePackages).filter(d => d.severity === 'error');
        if (errors.length) throw new Error(`${component.metadata.name}: ${errors.map(d => d.message).join('\n')}`);
      }
      return `${imports.join('\n')}\nexport const components=[${components.join(',')}];\nexport const packages=[${packages.join(',')}];`;
    },
    configureServer(server) {
      server.watcher.add(options.componentsRoot);
      const refresh = (file: string) => {
        if (file.replaceAll('\\', '/').startsWith(options.componentsRoot.replaceAll('\\', '/')) || options.packageManifests.includes(file)) {
          const module = server.moduleGraph.getModuleById(`\0${virtualId}`); if (module) server.moduleGraph.invalidateModule(module);
          server.ws.send({ type: 'full-reload' });
        }
      };
      server.watcher.on('add', refresh).on('unlink', refresh).on('change', refresh);
    },
  };
}
