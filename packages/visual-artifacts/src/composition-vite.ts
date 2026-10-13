import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';
import { componentReferences } from './validation.js';

/** Development reads source; builds read the composition snapshot selected by existing Publish. */
export function applicationComposition(options: { root: string; sharedComponentsRoot?: string }): Plugin {
  const id = 'virtual:uip-application-composition';
  let production = false;
  return {
    name: 'ui-platform-application-composition',
    configResolved(config) { production = config.command === 'build'; },
    resolveId(request) { if (request === id) return '\0' + id; },
    async load(request) {
      if (request !== '\0' + id) return;
      let root = options.root;
      if (production) {
        const manifest = JSON.parse(await readFile(path.join(root, 'presentation/presentation.manifest.json'), 'utf8').catch(() => '{}'));
        if (!manifest.activeVersion) throw new Error('Publish this Application presentation before building its production composition.');
        root = path.join(root, 'presentation/versions', `v${manifest.activeVersion}`, 'composition');
      }
      const imports: string[] = [], shells: string[] = [], pages: string[] = [], components: string[] = [], menus: string[] = [], styles: string[] = [];
      let index = 0;
      const required = new Set<string>(), emitted = new Set<string>(), componentIds = new Set<string>();
      const watchRead = async (file: string) => { const content = await readFile(file, 'utf8'); this.addWatchFile(file); return content; };
      const settingsFile = path.join(root, 'app.settings.json');
      const settings = JSON.parse(await watchRead(settingsFile)).presentation;
      const walk = async (dir: string, shared = false, expectedKind?: 'page' | 'shell') => {
        for (const entry of await readdir(dir, { withFileTypes: true }).catch(error => { if (error.code === 'ENOENT') return []; throw error; })) {
          if (entry.isSymbolicLink()) throw new Error('Composition source cannot use symbolic links.');
          const file = path.join(dir, entry.name);
          if (entry.isDirectory()) await walk(file, shared, expectedKind);
          else if (entry.name.endsWith('.visual.json')) {
            const m = JSON.parse(await readFile(file, 'utf8'));
            if (shared ? m.kind !== 'component' : m.kind !== expectedKind) throw new Error('Composition source contains an artifact outside its ownership collection.');
            if (emitted.has(file) || shared && (!required.has(m.componentId) || componentIds.has(m.componentId))) continue;
            if (m.developmentOnly && production) throw new Error('Development-only Components cannot enter the published runtime.');
            emitted.add(file); this.addWatchFile(file);
            if (m.kind === 'component') componentIds.add(m.componentId);
            const n = index++, stem = file.slice(0, -'.visual.json'.length).replaceAll('\\', '/');
            for (const id of [...componentReferences(await watchRead(stem + '.html')), ...(m.dependencies ?? [])]) required.add(id);
            imports.push(`import m${n} from ${JSON.stringify(file.replaceAll('\\', '/'))}; import s${n} from ${JSON.stringify(stem + '.html?raw')};`);
            for (const [extension, name, fallback] of [['.css', 'c', '""'], ['.functions.ts', 'f', '{}']]) {
              try { await watchRead(stem + extension); imports.push(extension === '.css' ? `import ${name}${n} from ${JSON.stringify(stem + extension + '?raw')};` : `import * as ${name}${n} from ${JSON.stringify(stem + extension)};`); }
              catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; imports.push(`const ${name}${n}=${fallback};`); }
            }
            (m.kind === 'shell' ? shells : m.kind === 'page' ? pages : components).push(`{metadata:m${n},source:s${n},css:c${n},functions:f${n}}`);
          }
        }
      };
      await walk(path.join(root, 'shells'), false, 'shell');
      await walk(path.join(root, 'src/pages'), false, 'page');
      // Development resolves Platform-owned source. Published/portable distributions
      // use frozen copies with the same identities, never an Application-owned catalog.
      let count = -1;
      while (count !== emitted.size) {
        count = emitted.size;
        if (!production && options.sharedComponentsRoot) await walk(options.sharedComponentsRoot, true);
        await walk(path.join(root, 'presentation/platform-components'), true);
      }
      for (const entry of await readdir(path.join(root, 'menus'))) if (entry.endsWith('.json')) { const file = path.join(root, 'menus', entry); const n = index++; await watchRead(file); imports.push(`import menu${n} from ${JSON.stringify(file.replaceAll('\\', '/'))};`); menus.push(`menu${n}`); }
      for (const relative of settings.siteStyles) { if (!/^styles\/[a-z0-9-]+\.css$/.test(relative)) throw new Error('Site styles must be Application source files.'); const file = path.join(root, relative).replaceAll('\\', '/'), n = index++; await watchRead(file); imports.push(`import css${n} from ${JSON.stringify(file + '?raw')};`); styles.push(`css${n}`); }
      const assetEntries: string[] = [];
      const assets = async (dir: string, prefix: string) => { for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) { if (entry.isSymbolicLink()) throw new Error('Assets cannot use symbolic links.'); const file = path.join(dir, entry.name); if (entry.isDirectory()) await assets(file, prefix + entry.name + '/'); else { const n = index++; this.addWatchFile(file); imports.push(`import asset${n} from ${JSON.stringify(file.replaceAll('\\', '/') + '?url')};`); assetEntries.push(`${JSON.stringify(prefix + entry.name)}:asset${n}`); } } };
      await assets(path.join(root, 'assets'), 'assets/');
      return `${imports.join('\n')}\nconst pages=[${pages.join(',')}];\nexport const platformComponents=[${components.join(',')}];\nexport const assetUrls={${assetEntries.join(',')}};\nexport const definition={settings:${JSON.stringify(settings)},shells:[${shells.join(',')}],pages,menus:[${menus.join(',')}],siteCss:[${styles.join(',')}].join('\\n'),routes:pages.map(p=>({pageId:p.metadata.artifactId,routeId:p.metadata.routeId,path:p.metadata.route}))};`;
    },
    configureServer(server) {
      for (const dir of ['shells', 'menus', 'styles', 'assets', 'src/pages']) server.watcher.add(path.join(options.root, dir));
      const refresh = (file: string) => { if (file.replaceAll('\\', '/').startsWith(options.root.replaceAll('\\', '/') + '/') && !file.includes('node_modules')) { const module = server.moduleGraph.getModuleById('\0' + id); if (module) server.moduleGraph.invalidateModule(module); server.ws.send({ type: 'full-reload' }); } };
      server.watcher.on('change', refresh).on('add', refresh).on('unlink', refresh);
    },
  };
}
