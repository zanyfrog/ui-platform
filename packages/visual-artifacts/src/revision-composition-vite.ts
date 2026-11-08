import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { VisualHelperBoundary } from './helper-boundary.js';
import { componentReferences, validateArtifact } from './validation.js';
import { regions, themeCss, validateMenu, applyMenuOverrides, composeShellMenus } from './composition.js';
import { RuntimeRevision, runtimeRefreshClient, runtimeRefreshModule, visualExtensions, runtimeLiteral, runtimeReaderServer, runtimeRevisionRefresh, assertNotVisualRole, runtimePackageDefinitions, validateRuntimeCss, type CapturedVisual } from './runtime-revision.js';
import { validateCompositionDefinition } from './composition-validation.js';
import type { CompositionDefinition } from './composition.js';
import { recoverRoleBundleRoot } from '@ui-platform/artifacts/storage';
import { withRuntimeGraphRead } from './runtime-read-admission.js';
import { capturePageRoutes } from './page-admission.js';
import { componentPackageDirectory, verifyComponentPackages } from './component-packages.js';

/** Development reads source; builds read the composition snapshot selected by existing Publish. */
export function revisionApplicationComposition(options: { revisionPinned?: true; root: string; sharedComponentsRoot?: string; packageManifests?: string[]; publishedVersion?: number }): Plugin {
  const id = 'virtual:uip-application-composition';
  const watchId = 'virtual:uip-composition-watch';
  let production = false;
  let boundary: VisualHelperBoundary | undefined, viteServer: ViteDevServer | undefined;
  let refresh: ReturnType<typeof runtimeRevisionRefresh> | undefined;
  const managedRoots = [path.join(options.root, 'src/pages'), path.join(options.root, 'shells'), path.join(options.root, 'presentation/platform-components'), options.sharedComponentsRoot].filter((root): root is string => !!root);
  return {
    name: 'ui-platform-application-composition',
    enforce: 'pre',
    // Admission creates and removes private lock files while compiling. They
    // must not trigger Vite's ordinary add/unlink reload handling.
    config() { return { server: { watch: { ignored: ['**/.uib/**'] } } }; },
    configResolved(config) {
      production = config.command === 'build';
      if (options.publishedVersion !== undefined && (!production || !Number.isSafeInteger(options.publishedVersion) || options.publishedVersion < 1)) {
        throw new Error('An explicit publication version requires a valid production build.');
      }
    },
    resolveId(request, importer) { boundary?.guard(request, importer); if (request === id || request === watchId) return '\0' + request; },
    async load(request) {
      if (request === '\0' + watchId) return runtimeRefreshClient;
      if (request !== '\0' + id) { if (!request.startsWith('\0')) await assertNotVisualRole(request, managedRoots); return; }
      const compile = async () => {
      const helpers = boundary ??= new VisualHelperBoundary(async (request, importer) => {
        if (/^(?:https?:|data:|blob:)/.test(request)) throw new Error('Visual functions cannot load unverified remote helper modules.');
        const resolved = await this.resolve(request, importer, { skipSelf: true }); if (!resolved) throw new Error(`Non-Visual helper could not be resolved: ${request}`); await assertNotVisualRole(resolved.id, managedRoots); return resolved.id;
      }, id => { const node = viteServer?.moduleGraph.getModuleById(id); return node ? { code: node.transformResult?.code, imports: [...node.importedModules].map(child => child.id).filter((id): id is string => !!id) } : undefined; });
      let root = options.root;
      let expectedPackageHash: string | undefined;
      if (production) {
        const manifest = JSON.parse(await readFile(path.join(root, 'presentation/presentation.manifest.json'), 'utf8').catch(() => '{}'));
        const version = options.publishedVersion ?? manifest.activeVersion;
        if (!Number.isSafeInteger(version) || version < 1) throw new Error('Publish this Application presentation before building its production composition.');
        const records = manifest.versions?.filter((record: { version: number }) => record.version === version);
        expectedPackageHash = records?.[0]?.componentPackageIntegrity;
        if (options.publishedVersion !== undefined && (records?.length !== 1 || !expectedPackageHash)) throw new Error('The selected frozen version is not admitted.');
        root = path.join(root, 'presentation/versions', `v${version}`, 'composition');
      }
      // Runtime admission never repairs source. A pending transaction blocks the
      // complete capture before any role is read, including unused collections.
      if (!production) for (const owner of [path.join(root, 'src/pages'), path.join(root, 'shells'), options.sharedComponentsRoot, path.join(root, 'presentation/platform-components')]) if (owner) await recoverRoleBundleRoot(owner, { recovery: 'refuse' });
      const imports: string[] = [], shells: string[] = [], pages: string[] = [], components: string[] = [], menus: string[] = [], styles: string[] = [];
      const watch = (file: string) => { if (viteServer) viteServer.watcher.add(file); else this.addWatchFile(file); };
      const revision = new RuntimeRevision(watch);
      const captured: CapturedVisual[] = [], menuValues: CompositionDefinition['menus'] = [];
      let index = 0;
      const required = new Set<string>(), emitted = new Set<string>(), componentIds = new Set<string>();
      const watchRead = (file: string) => revision.text(file);
      const settingsFile = path.join(root, 'app.settings.json');
      const settings = JSON.parse(await watchRead(settingsFile)).presentation;
      const walk = async (dir: string, shared = false, expectedKind?: 'page' | 'shell') => {
        for (const entry of await revision.directory(dir)) {
          if (entry.isSymbolicLink()) throw new Error('Composition source cannot use symbolic links.');
          const file = path.join(dir, entry.name);
          if (entry.isDirectory()) await walk(file, shared, expectedKind);
          else if (entry.name.endsWith('.visual.json')) {
            const ownerRoot = shared ? options.sharedComponentsRoot && file.startsWith(options.sharedComponentsRoot + path.sep) ? options.sharedComponentsRoot : path.join(root, 'presentation/platform-components') : path.join(root, expectedKind === 'page' ? 'src/pages' : 'shells');
            const artifact = await revision.visual(file, ownerRoot, production);
            const m = artifact.metadata;
            if (shared ? m.kind !== 'component' : m.kind !== expectedKind) throw new Error('Composition source contains an artifact outside its ownership collection.');
            if (emitted.has(file) || shared && (!required.has(m.componentId!) || componentIds.has(m.componentId!))) continue;
            if (m.developmentOnly && production) throw new Error('Development-only Components cannot enter the published runtime.');
            emitted.add(file); watch(file);
            if (m.kind === 'component') componentIds.add(m.componentId!);
            const n = captured.length; captured.push(artifact);
            for (const id of [...componentReferences(artifact.source), ...(m.dependencies ?? [])]) required.add(id);
            imports.push(`import * as f${n} from 'uip-captured-function:${n}';`);
            (m.kind === 'shell' ? shells : m.kind === 'page' ? pages : components).push(runtimeLiteral(artifact, n));
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
      for (const entry of await revision.directory(path.join(root, 'menus'))) if (entry.name.endsWith('.json')) { const file = path.join(root, 'menus', entry.name); const menu = JSON.parse(await watchRead(file)); validateMenu(menu); menuValues.push(menu); menus.push(JSON.stringify(menu)); }
      for (const relative of settings.siteStyles) { if (!/^styles\/[a-z0-9-]+\.css$/.test(relative)) throw new Error('Site styles must be Application source files.'); const file = path.join(root, relative); styles.push(await watchRead(file)); }
      const assetEntries: string[] = [];
      // Managed image URLs reject data: schemes, including Vite's default small-asset inlining.
      const assets = async (dir: string, prefix: string) => { for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) { if (entry.isSymbolicLink()) throw new Error('Assets cannot use symbolic links.'); if (entry.isFile() && entry.name === '.gitkeep') continue; const file = path.join(dir, entry.name); if (entry.isDirectory()) await assets(file, prefix + entry.name + '/'); else { const n = index++; watch(file); imports.push(`import asset${n} from ${JSON.stringify(file.replaceAll('\\', '/') + '?url&no-inline')};`); assetEntries.push(`${JSON.stringify(prefix + entry.name)}:asset${n}`); } } };
      await assets(path.join(root, 'assets'), 'assets/');
      const runtimeComponents = captured.filter(item => item.metadata.kind === 'component');
      const runtimePages = captured.filter(item => item.metadata.kind === 'page');
      const runtimeShells = captured.filter(item => item.metadata.kind === 'shell');
      const definition: CompositionDefinition = { settings, pages: runtimePages, shells: runtimeShells, menus: menuValues, siteCss: styles.join('\n'), routes: capturePageRoutes(runtimePages) };
      const frozenPackages = path.join(root, componentPackageDirectory);
      const hasFrozenPackages = production && (!!expectedPackageHash || await readFile(path.join(frozenPackages, 'integrity.json')).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; }));
      if (hasFrozenPackages) await verifyComponentPackages(frozenPackages, expectedPackageHash);
      const packages = await runtimePackageDefinitions(revision, hasFrozenPackages ? frozenPackages : options.root, file => imports.push(`import ${JSON.stringify(file.replaceAll('\\', '/'))};`));
      // Same explicit installed-package manifest contract as visualArtifacts.
      // Hosts must admit these physical package inputs; no catalog discovery.
      for (const file of hasFrozenPackages ? [] : options.packageManifests ?? []) {
        const manifest = JSON.parse(await revision.text(file));
        const packageInfo = JSON.parse(await revision.text(path.join(path.dirname(file), 'package.json')));
        if (typeof packageInfo.name !== 'string' || !packageInfo.name) throw new Error('Explicit composition package name is missing.');
        for (const entry of manifest.components ?? []) if (entry.module) {
          const id = entry.identity?.componentId ?? entry.id ?? `${packageInfo.name}:${entry.tagName}`;
          if (packages.some(item => item.id === id)) throw new Error('Duplicate explicit composition package identity.');
          packages.push({ ...entry, id, definition: entry.identity && entry.builder && entry.runtime ? entry : undefined });
          imports.push(`import ${JSON.stringify(path.resolve(path.dirname(file), entry.module).replaceAll('\\', '/'))};`);
        }
      }
      validateCompositionDefinition(definition, runtimeComponents, packages);
      await validateRuntimeCss(definition.siteCss);
      const code = await revision.finish(`${imports.join('\n')}\nconst pages=[${pages.join(',')}];\nexport const platformComponents=[${components.join(',')}];\nexport const packages=${JSON.stringify(packages)};\nexport const assetUrls={${assetEntries.join(',')}};\nexport const definition={settings:${JSON.stringify(settings)},shells:[${shells.join(',')}],pages,menus:[${menus.join(',')}],siteCss:${JSON.stringify(styles.join('\n'))},routes:pages.map(p=>({pageId:p.metadata.artifactId,routeId:p.metadata.routeId,path:p.metadata.route}))};\nregisterManagedVisualGraph(runtimeRevision,[...definition.pages,...definition.shells,...platformComponents],definition,assetUrls);`, captured, helpers);
      return viteServer ? runtimeRefreshModule(watchId, request, code) : code;
      };
      return production ? compile() : withRuntimeGraphRead(options.sharedComponentsRoot ?? options.root, compile);
    },
    transform(code, id) { if (boundary?.isHelper(id)) boundary.check(code, id); },
    configureServer(server) {
      viteServer = server;
      runtimeReaderServer(server, options.root, managedRoots);
      for (const dir of ['shells', 'menus', 'styles', 'assets', 'src/pages']) server.watcher.add(path.join(options.root, dir));
      if (options.sharedComponentsRoot) server.watcher.add(options.sharedComponentsRoot);
      const sourceRoots = [...managedRoots, ...['menus', 'styles', 'assets'].map(name => path.join(options.root, name))].map(root => root.replaceAll('\\', '/') + '/');
      const sourceFiles = ['app.settings.json', 'package.json', 'app.manifest.json'].map(name => path.join(options.root, name).replaceAll('\\', '/'));
      refresh = runtimeRevisionRefresh(server, file => sourceRoots.some(root => file.replaceAll('\\', '/').startsWith(root)) || sourceFiles.includes(file.replaceAll('\\', '/')) || !!boundary?.isHelper(file), file => !boundary?.isHelper(file) && (managedRoots.some(root => file.replaceAll('\\', '/').startsWith(root.replaceAll('\\', '/') + '/') && visualExtensions.some(extension => file.endsWith(extension))) || sourceFiles.includes(file.replaceAll('\\', '/')) || ['menus', 'styles'].some(name => file.replaceAll('\\', '/').startsWith(path.join(options.root, name).replaceAll('\\', '/') + '/'))));
    },
    hotUpdate(context) {
      if (context.file.replaceAll('\\', '/').startsWith(options.root.replaceAll('\\', '/') + '/presentation/versions/')) {
        const sentinel = this.environment.moduleGraph.getModuleById('\0' + watchId);
        return sentinel ? [sentinel] : [];
      }
      if (/(?:^|\/)\.uib(?:\/|$)/i.test(context.file.replaceAll('\\', '/'))) return [];
      if (refresh?.relevant(context.file)) {
        refresh.refresh(context.file);
        const sentinel = this.environment.moduleGraph.getModuleById('\0' + watchId);
        return sentinel ? [sentinel] : [];
      }
    },
    closeBundle() { refresh?.close(); },
  };
}
