import { build } from 'vite';
import path from 'node:path';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { applicationComposition } from '@ui-platform/visual-artifacts/vite';
import { digest, deny } from './boundary.js';
import type { PublicRelease } from './runtime.js';
import type { ReleaseAdmission } from './releases.js';
import { ApplicationPublicationSelection } from './publication-integration.js';

/** Trusted local build adapter over the accepted publication compiler. This performs no activation/deployment. */
export async function buildReleasedBrowser(applicationRoot: string, platformRoot: string, input: ReleaseAdmission, output: string): Promise<PublicRelease> {
  if (![applicationRoot, platformRoot, output].every(path.isAbsolute) || output.startsWith(applicationRoot + path.sep)) deny();
  const release = structuredClone(input);
  const relative = path.relative(applicationRoot, release.compositionRoot).split(path.sep).join('/');
  const version = Number(/^presentation\/versions\/v([1-9]\d*)\/composition$/.exec(relative)?.[1]);
  if (!Number.isSafeInteger(version)) deny();
  const verify = async () => {
    const current = await new ApplicationPublicationSelection(applicationRoot, release.applicationId, release.schemaIdentity).readPublishedVersion(version);
    if (JSON.stringify(current) !== JSON.stringify(release)) deny();
  };
  await verify();
  const { releaseId } = release;
  const entry = 'virtual:stage5-released-entry', resolved = '\0' + entry;
  await build({ configFile: false, root: applicationRoot, logLevel: 'warn', publicDir: false,
    plugins: [applicationComposition({ root: applicationRoot, publishedVersion: version }), { name: 'released-service-entry',
      resolveId(id) { if (id === entry) return resolved; },
      load(id) { if (id !== resolved) return; return `
        import {definition,platformComponents,packages} from 'virtual:uip-application-composition';
        import {mountVisualArtifact,mountComposedPage} from '@ui-platform/visual-artifacts/runtime';
        import {releasedRuntimeServices} from ${JSON.stringify(path.join(platformRoot,'src/shared/released-runtime-services.ts').replaceAll('\\','/'))};
        const page=definition.pages.find(p=>p.metadata.route===location.pathname);
        if(page){const options={components:platformComponents,packages,servicesForArtifact:metadata=>releasedRuntimeServices({releaseId:${JSON.stringify(releaseId)},metadata})};
          const mounted=page.metadata.shellId?mountComposedPage(definition,page,options):mountVisualArtifact(page,options);document.body.replaceChildren(mounted.host);}
        else document.body.textContent='Page not found';`; },
    }], build: { outDir: output, emptyOutDir: true, minify: false, cssCodeSplit: false, rollupOptions: { input: entry, output: { entryFileNames: 'application.js', assetFileNames: '[name][extname]' } } },
  });
  const names = await readdir(output), css = names.filter(n=>n.endsWith('.css')).map(n=>`<link rel="stylesheet" href="/${n}">`).join('');
  await writeFile(path.join(output,'index.html'), `<!doctype html><html><head><meta charset="utf-8"><title>Published application</title>${css}</head><body><script type="module" src="/application.js"></script></body></html>`);
  const publicFiles: PublicRelease['publicFiles'] extends ReadonlyMap<infer K,infer V> ? Map<K,V> : never = new Map();
  const mediaTypes:Record<string,string>={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2'};
  const walk=async(relative='')=>{for(const item of await readdir(path.join(output,relative),{withFileTypes:true})){const name=path.posix.join(relative,item.name);if(item.isSymbolicLink())deny();if(item.isDirectory())await walk(name);else{const bytes=await readFile(path.join(output,name));publicFiles.set('/'+name,{bytes,sha256:digest(bytes),mediaType:mediaTypes[path.extname(name)]??'application/octet-stream'});}}};
  await walk(); const index=publicFiles.get('/index.html')!;publicFiles.set('/',index);
  // All public page URLs serve the same generated pathname entry; metadata remains the accepted frozen compiler output.
  const pagesRoot=path.join(release.compositionRoot,'src/pages');
  const routes=async(dir:string)=>{for(const item of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())await routes(file);else if(item.name.endsWith('.visual.json')){const m=JSON.parse(await readFile(file,'utf8'));if(typeof m.route==='string'&&!m.route.includes(':'))publicFiles.set(m.route,index);}}};await routes(pagesRoot);
  await verify();
  return { releaseId, publicFiles };
}
