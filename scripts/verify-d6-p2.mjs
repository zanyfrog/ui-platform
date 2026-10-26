// Actual owner implementation, fixed inert native fixture bytes, no backend/native execution.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
const root = path.resolve(import.meta.dirname, '..'), evidence = path.join(root, 'evidence/d6-p2-package-seals-20261026');
const out = path.join(evidence, 'run-' + Date.now()); fs.mkdirSync(out); fs.mkdirSync(path.join(out, 'inputs'));
const sources = [
  'src/server/package-publications.ts', 'src/server/package-publication-profile.ts',
  ...['storage-api', 'storage', 'role-bundle', 'bundle', 'file-operations', 'types'].map(n => `packages/artifacts/src/${n}.ts`),
  'tests/d6-p2/publications.test.ts', 'tests/d6-r1/fs-guard.ts',
].map(p => path.join(root, p));
const data = JSON.parse(fs.readFileSync(path.join(evidence, 'profile-preparation-result.json'))).fixtureData.map(r => path.join(root, r.file));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const admitted = new Set(sources), toolRequire = createRequire(import.meta.url), compilerRequire = createRequire(path.join(root, 'packages/artifacts/package.json')), ts = compilerRequire('typescript');
const builtins = new Set(['node:test','node:assert/strict','node:fs/promises','node:fs','node:path','node:crypto','node:timers/promises','node:async_hooks']);
const hashes = Object.fromEntries(sources.concat(data).map(p => [path.relative(root,p), hash(p)]));
for (const file of sources.concat(data)) fs.writeFileSync(path.join(out,'inputs',hash(file)+'.txt'),fs.readFileSync(file));
fs.writeFileSync(path.join(out,'admission.json'), JSON.stringify({sources,fixtureData:data,hashes,builtins:[...builtins],entry:'tests/d6-p2/publications.test.ts',serial:true,retries:0,workspaceConfiguration:false,setup:[],tools:{node:process.version,esbuild:toolRequire('esbuild/package.json').version,typescript:ts.version},initialization:'Actual package owner/profile and Foundation declarations/local lock map; pure pinned metadata freeze/hash only. Native bytes are inert fixture data, never executable imports. Product IO guarded to each disposable root, ancestor lstat only. PID probes throw. Graph trace disabled. No installer/backend initialization.'},null,2));
try {
  const result = await build({absWorkingDir:root,entryPoints:['tests/d6-p2/publications.test.ts'],bundle:true,write:false,platform:'node',format:'esm',target:'es2022',metafile:true,plugins:[{name:'exact-p2-owner-inputs',setup(b){
    b.onResolve({filter:/.*/},args=>{
      if(args.path==='d6-r1-real-fs'){assert.equal(args.importer,path.join(root,'tests/d6-r1/fs-guard.ts'));return{path:'node:fs/promises',external:true};}
      if(args.path==='node:fs/promises'&&!args.importer.includes(path.join('tests','d6-')))return{path:path.join(root,'tests/d6-r1/fs-guard.ts')};
      if(args.path.startsWith('node:')){assert.ok(builtins.has(args.path));return{path:args.path,external:true};}
      let resolved=args.path==='@ui-platform/artifacts/storage'?path.join(root,'packages/artifacts/src/storage-api.ts'):path.resolve(args.resolveDir||root,args.path);
      if(resolved.endsWith('.js'))resolved=resolved.slice(0,-3)+'.ts';assert.ok(admitted.has(resolved),'UNADMITTED_IMPORT '+resolved);return{path:resolved};
    });
    b.onLoad({filter:/.*/},args=>{assert.ok(admitted.has(args.path));return{contents:fs.readFileSync(args.path,'utf8'),loader:'ts',resolveDir:path.dirname(args.path)};});
  }}]});
  fs.writeFileSync(path.join(out,'resolved-graph.json'),JSON.stringify(result.metafile,null,2));const entry=path.join(out,'publications.test.mjs');fs.writeFileSync(entry,result.outputFiles[0].text);
  const env={...process.env,UI_GRAPH_LOCK_TRACE:'0',D6_P2_TRACE_FILE:path.join(out,'filesystem-traces.json')};delete env.NODE_OPTIONS;delete env.NODE_PATH;delete env.UI_GRAPH_LOCK_METRICS;
  const run=spawnSync(process.execPath,['--test','--test-concurrency=1',entry],{cwd:root,encoding:'utf8',env,timeout:45000});
  fs.writeFileSync(path.join(out,'test-results.txt'),(run.stdout??'')+(run.stderr??''));assert.equal(run.status,0,run.stdout+run.stderr);
  const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,strict:true,skipLibCheck:true,noEmit:true,types:['node'],typeRoots:[path.join(root,'node_modules/@types')],paths:{'@ui-platform/artifacts/storage':[path.join(root,'packages/artifacts/src/storage-api.ts')]}};
  const host=ts.createCompilerHost(options),read=host.readFile.bind(host),lib=path.dirname(compilerRequire.resolve('typescript/lib/lib.es2022.d.ts'));
  host.readFile=file=>{const resolved=path.resolve(file);if(resolved.endsWith('.json'))return read(file);assert.ok(admitted.has(resolved)||[lib,path.join(root,'node_modules/@types/node'),path.join(root,'node_modules/undici-types')].some(p=>resolved.startsWith(p+path.sep)),'UNADMITTED_TYPE_INPUT '+resolved);return read(file);};
  const program=ts.createProgram([path.join(root,'src/server/package-publications.ts')],options,host);
  fs.writeFileSync(path.join(out,'typecheck-admission.json'),JSON.stringify({roots:program.getRootFileNames(),sourceFiles:program.getSourceFiles().map(f=>({path:f.fileName,sha256:hash(f.fileName)})),options},null,2));
  const diagnostics=ts.getPreEmitDiagnostics(program);fs.writeFileSync(path.join(out,'typecheck.txt'),ts.formatDiagnostics(diagnostics,{getCanonicalFileName:f=>f,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}));assert.equal(diagnostics.length,0,'Strict scoped typecheck failed');
  const installer=fs.readFileSync(path.join(root,'src/server/package-installer.ts'),'utf8');
  const old=spawnSync('git',['show','HEAD:src/server/package-installer.ts'],{cwd:root,encoding:'utf8'});assert.equal(old.status,0);
  const normalize=s=>s.replaceAll('\r\n','\n');
  assert.equal(normalize(installer).replace("export { createPackagePublicationOwner, PackagePublicationError } from './package-publications.js';\n",''),normalize(old.stdout),'Existing installer body changed');
  fs.writeFileSync(path.join(out,'compatibility.json'),JSON.stringify({installerBodyEquivalentToBaseline:true,onlyInstallerChange:'additive owner API re-export; pure metadata/declaration initialization',legacyActivationPresentationEditingCodeExecuted:false,legacyBehaviorEvidence:'unchanged implementations, no automatic hooks or migrations',nativeCodeExecuted:false},null,2));
  assert.deepEqual(Object.fromEntries(sources.concat(data).map(p=>[path.relative(root,p),hash(p)])),hashes);
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,tests:21,serial:true,retries:0,strictTypecheckDiagnostics:0,nativeCodeExecuted:false,sourceHashesUnchanged:true},null,2));console.log('PASS '+out);
}catch(error){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(error),stack:error.stack},null,2));throw error;}
