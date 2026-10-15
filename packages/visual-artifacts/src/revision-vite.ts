import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Plugin, ViteDevServer } from 'vite';
import { VisualHelperBoundary } from './helper-boundary.js';
import { revisionPageEntry } from './page-entry.js';
import { validateArtifact } from './validation.js';
import type { PackageComponent, RuntimeArtifact } from './model.js';
import { withRoleBundleGraph, recoverRoleBundleRoot } from '@ui-platform/artifacts/storage';
import { RuntimeRevision, runtimeLiteral, assertNotVisualRole, runtimeReaderServer, runtimeRevisionRefresh, type CapturedVisual } from './runtime-revision.js';

/** Discovery is a build-time source import, not a generated runtime artifact or HTTP dependency. */
export function revisionVisualArtifacts(options: { revisionPinned?: true; componentsRoot?: string; packageManifests?: string[]; applicationRoot?: string }): Plugin {
  const virtualId = 'virtual:uip-visual-artifacts';
  const pageId = 'virtual:uip-visual-page';
  const watchId = 'virtual:uip-visual-watch';
  let projectRoot = options.applicationRoot ?? process.cwd();
  let boundary: VisualHelperBoundary | undefined, viteServer: ViteDevServer | undefined;
  let compositionAvailable = false;
  let refresh: ReturnType<typeof runtimeRevisionRefresh> | undefined;
  const pageOwner = () => path.join(options.applicationRoot ?? projectRoot, options.applicationRoot ? 'src/pages' : 'src');
  const managedRoots = () => [pageOwner(), path.join(options.applicationRoot ?? projectRoot, 'shells'), options.componentsRoot].filter((root): root is string => !!root);
  return {
    name: 'ui-platform-visual-artifacts',
    enforce: 'pre',
    configResolved(config) { projectRoot = config.root; compositionAvailable = config.plugins.some(plugin => plugin.name === 'ui-platform-application-composition'); },
    async resolveId(id, importer, resolveOptions) {
      boundary?.guard(id, importer);
      if (id === watchId) return '\0' + watchId;
      // Vite's optimizer scans the old entry text without running transforms.
      // Exclude role edges from dependency discovery; runtime loads remain blocked.
      if ((resolveOptions as { scan?: boolean }).scan && /(?:\.visual\.json|\.html|\.css|\.functions(?:\.ts)?)(?:\?|$)/.test(id)) return { id, external: true };
      if (id === virtualId) return `\0${virtualId}`;
      if (id === pageId) {
        if (!importer || importer.startsWith('\0')) throw new Error('A Visual Page entry location is required.');
        return `\0${pageId}:${encodeURIComponent(path.join(path.dirname(importer.split('?')[0]), 'page.visual.json'))}.js`;
      }
      if (!id.startsWith('\0') && !id.startsWith('virtual:')) {
        const resolved = await this.resolve(id, importer, { skipSelf: true });
        // Vite resolves addWatchFile dependencies during import analysis. The
        // aggregate emits no role imports; watch edges must not become loaders.
        if (resolved && !importer?.startsWith('\0virtual:uip-')) await assertNotVisualRole(resolved.id, managedRoots());
      }
    },
    async load(id) {
      if (id === '\0' + watchId) return 'if(import.meta.hot)import.meta.hot.accept();';
      const pageFile = id.startsWith(`\0${pageId}:`) ? decodeURIComponent(id.slice(`\0${pageId}:`.length, -3)) : undefined;
      if (pageFile) {
        const relative = path.relative(pageOwner(), pageFile);
        if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error('The Page entry is outside its authoritative source collection.');
      }
      if (id !== `\0${virtualId}` && !pageFile) { if (!id.startsWith('\0')) await assertNotVisualRole(id, managedRoots()); return; }
      if (!pageFile && compositionAvailable && options.applicationRoot && !options.componentsRoot) return "export { packages } from 'virtual:uip-application-composition'; export const components=[];";
      return withRoleBundleGraph(options.componentsRoot ?? options.applicationRoot ?? projectRoot, async () => {
      if (options.componentsRoot) await recoverRoleBundleRoot(options.componentsRoot);
      if (pageFile) await recoverRoleBundleRoot(pageOwner());
      const helpers = boundary ??= new VisualHelperBoundary(async (request, importer) => {
        if (/^(?:https?:|data:|blob:)/.test(request)) throw new Error('Visual functions cannot load unverified remote helper modules.');
        const resolved = await this.resolve(request, importer, { skipSelf: true });
        if (!resolved) throw new Error(`Non-Visual helper could not be resolved: ${request}`);
        await assertNotVisualRole(resolved.id, managedRoots());
        return resolved.id;
      }, id => { const node = viteServer?.moduleGraph.getModuleById(id); return node ? { code: node.transformResult?.code, imports: [...node.importedModules].map(child => child.id).filter((id): id is string => !!id) } : undefined; });
      const watch = (file: string) => { if (viteServer) viteServer.watcher.add(file); else this.addWatchFile(file); };
      const revision = new RuntimeRevision(watch);
      const imports: string[] = [], components: string[] = [], packages: string[] = [];
      const sourceComponents: RuntimeArtifact[] = [], sourcePackages: PackageComponent[] = [];
      const captured: CapturedVisual[] = [];
      const walk = async (dir: string) => {
        for (const item of await revision.directory(dir)) {
          if (item.name.startsWith('.') || item.isSymbolicLink()) continue;
          const file = path.join(dir, item.name);
          if (item.isDirectory()) await walk(file);
          else if (item.name.endsWith('.visual.json')) {
            const artifact = await revision.visual(file, options.componentsRoot!);
            const metadata = artifact.metadata;
            if (metadata.kind !== 'component') throw new Error(`Only Components belong in ${options.componentsRoot}.`);
            watch(file);
            const index = captured.length; captured.push(artifact);
            imports.push(`import * as f${index} from 'uip-captured-function:${index}';`);
            sourceComponents.push(artifact);
            components.push(runtimeLiteral(artifact, index));
          }
        }
      };
      if (options.componentsRoot) await walk(options.componentsRoot);
      const manifests = [...(options.packageManifests ?? [])];
      if (options.applicationRoot) {
        const file = path.join(options.applicationRoot, 'package.json'); watch(file);
        const pkg = JSON.parse(await revision.text(file));
        const manifestFile = path.join(options.applicationRoot, 'app.manifest.json'); watch(manifestFile);
        const app = JSON.parse(await revision.text(manifestFile).catch(error => { if (error.code === 'ENOENT') return '{}'; throw error; }));
        for (const name of Object.keys(pkg.dependencies ?? {})) {
          if (app.packages?.[name]?.enabled === false) continue;
          const candidate = path.join(options.applicationRoot, 'node_modules', name, 'ui.component.json');
          try { await readFile(candidate); manifests.push(candidate); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        }
      }
      for (const file of manifests) {
        watch(file);
        const manifest = JSON.parse(await revision.text(file));
        const packageJson = JSON.parse(await revision.text(path.join(path.dirname(file), 'package.json')));
        const require = createRequire(path.join(path.dirname(file), 'package.json'));
        for (const entry of manifest.components ?? []) {
          if (!entry.module) continue;
          const module = path.resolve(path.dirname(file), entry.module).replaceAll('\\', '/');
          // Resolve the package's real module; Vite compiles it with the application's normal dependency graph.
          require.resolve(module);
          imports.push(`import ${JSON.stringify(module)};`);
          const pkg = { ...entry, id: entry.identity?.componentId ?? entry.id ?? `${packageJson.name}:${entry.tagName}`, definition: entry.identity && entry.builder && entry.runtime ? entry : undefined };
          packages.push(JSON.stringify(pkg)); sourcePackages.push(pkg);
        }
      }
      const seen = new Set<string>();
      for (const component of sourceComponents) {
        const id = component.metadata.componentId!; if (seen.has(id)) throw new Error(`Duplicate Component identity: ${id}.`); seen.add(id);
        const errors = validateArtifact(component, sourceComponents, sourcePackages).filter(d => d.severity === 'error');
        if (errors.length) throw new Error(`${component.metadata.name}: ${errors.map(d => d.message).join('\n')}`);
      }
      let pageExport = '';
      if (pageFile) {
        const artifact = await revision.visual(pageFile, pageOwner());
        if (artifact.metadata.kind !== 'page') throw new Error('Expected a Page entry.');
        if (artifact.metadata.shellId) {
          if (!compositionAvailable) throw new Error('A composed Page requires the revision-aware applicationComposition plugin.');
          return `import { definition, platformComponents, packages, assetUrls, runtimeRevision } from 'virtual:uip-application-composition';\nexport const page=definition.pages.find(page=>page.metadata.artifactId===${JSON.stringify(artifact.metadata.artifactId)});\nif(!page)throw new Error('The Page changed while its composed revision was loading. Reload the graph.');\nexport const components=platformComponents; export { definition as composition, packages, assetUrls, runtimeRevision };`;
        }
        const errors = validateArtifact(artifact, sourceComponents, sourcePackages).filter(d => d.severity === 'error');
        if (errors.length) throw new Error(errors.map(d => d.message).join('\n'));
        const index = captured.length; captured.push(artifact); imports.push(`import * as f${index} from 'uip-captured-function:${index}';`);
        pageExport = `export const page=${runtimeLiteral(artifact, index)};`;
      }
      const code = await revision.finish(`${imports.join('\n')}\nexport const components=[${components.join(',')}];\nexport const packages=[${packages.join(',')}];\nexport const composition=undefined; export const assetUrls={};\n${pageExport}\nregisterManagedVisualGraph(runtimeRevision,[...components${pageFile ? ',page' : ''}]);`, captured, helpers);
      return (viteServer ? `import '${watchId}';\n` : '') + code;
      });
    },
    transform(code, id) {
      if (boundary?.isHelper(id)) { boundary.check(code, id); return; }
      const entry = revisionPageEntry(code, id);
      if (entry) return { code: entry, map: null };
    },
    configureServer(server) {
      viteServer = server;
      runtimeReaderServer(server, projectRoot, managedRoots());
      if (options.componentsRoot) server.watcher.add(options.componentsRoot);
      refresh = runtimeRevisionRefresh(server, file => managedRoots().some(root => file.replaceAll('\\', '/').startsWith(root.replaceAll('\\', '/') + '/')) || !!boundary?.isHelper(file) || !!options.packageManifests?.some(name => name.replaceAll('\\', '/') === file.replaceAll('\\', '/')) || ['package.json', 'app.manifest.json'].some(name => file.replaceAll('\\', '/') === path.join(options.applicationRoot ?? projectRoot, name).replaceAll('\\', '/')));
    },
    hotUpdate(context) {
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
