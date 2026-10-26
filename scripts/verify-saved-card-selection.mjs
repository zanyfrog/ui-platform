// Exact source-owner selection + nonpersisting actual-editor verification.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build, transform } from 'esbuild';

const root=path.resolve(import.meta.dirname,'..');
const evidence=path.join(root,'evidence/builder-v1-wp5-f-saved-card-selection-20261025');
const out=path.join(evidence,'run-'+Date.now());fs.mkdirSync(out);
const expression=path.resolve(root,'../UI Platform Data Services/packages/dataset-operations/src/declarative-expression.ts');
const manifest=path.resolve(root,'../ui-base/packages/ui-base-ui/ui.component.json');
const sources=[
  ...['source','validation','model','form','expression','composition'].map(n=>`packages/visual-artifacts/src/${n}.ts`),
  ...['editor','saved-card-target','menu-controls','authoring-controls'].map(n=>`src/client/visual-artifacts/${n}.ts`),
  ...['editing-lifecycle','autosave-configuration','specialized-transport','saved-source'].map(n=>`src/client/artifact-editor/${n}.ts`),
  'src/shared/platform-settings.ts',
  'tests/source-identity/visual-source-barrel.ts',
  ...['owner-target.test.ts','editor-harness.ts','source-barrel.ts','type-barrel.ts','snapshot-types.ts','fixtures.ts','editor-checks.mjs'].map(n=>`tests/saved-card-selection/${n}`),
  'evidence/builder-v1-wp5-f-saved-card-selection-20261025/editor-before.ts.txt',
].map(p=>path.resolve(root,p)).concat(expression,manifest);
const admitted=new Set(sources);
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const hashes=Object.fromEntries(sources.map(p=>[path.relative(root,p).replaceAll('\\','/'),hash(p)]));
fs.mkdirSync(path.join(out,'inputs'));for(const file of sources)fs.writeFileSync(path.join(out,'inputs',hash(file)+'.txt'),fs.readFileSync(file));
const toolRequire=createRequire(import.meta.url);
const compilerRequire=createRequire(path.resolve(root,'packages/artifacts/package.json'));
const ts=compilerRequire('typescript');
const browserRequire=createRequire(path.resolve(root,'../ui-base/package.json'));
const tools={node:process.version,esbuild:{entry:toolRequire.resolve('esbuild'),version:toolRequire('esbuild/package.json').version},typescript:{entry:compilerRequire.resolve('typescript'),version:ts.version},dom:{entry:browserRequire.resolve('happy-dom'),version:browserRequire('happy-dom/package.json').version}};
const staticSources=['src/client/builder-workspace/adapters.ts','src/client/builder-workspace/coordinator.ts'].map(p=>({path:p,sha256:hash(path.join(root,p)),scope:'syntax transformation and static wiring only; no import resolution or execution'}));
fs.writeFileSync(path.join(out,'admission.json'),JSON.stringify({sources,hashes,staticSources,tools,serial:true,retries:0,setupHooks:[],workspaceConfig:false,entrypoints:['owner-target.test.ts','editor-harness.ts','editor-checks.mjs'],initialization:'Actual source-owner editor DOM/listeners/existing timers in injected DOM platform only',forbidden:['package runtime index','session execution','backend','protected source','native rendering'],data:'Authored memory bundles and exact package declaration JSON only'},null,2));
const graphs={};
async function compile(entry,platform,before=false){
  const plugin={name:'exact-identity-source-inputs',setup(b){
    b.onResolve({filter:/.*/},args=>{
      if(args.path.startsWith('node:')){assert.equal(platform,'node');return {path:args.path,external:true};}
      let resolved;
      if(args.path==='@ui-platform/visual-artifacts')resolved=path.join(root,'tests/saved-card-selection/source-barrel.ts');
      else if(args.path==='@ui-platform/dataset-operations/expression')resolved=expression;
      else resolved=path.resolve(args.resolveDir||root,args.path);
      if(resolved.endsWith('.js')&&!fs.existsSync(resolved))resolved=resolved.slice(0,-3)+'.ts';
      if(before&&resolved===path.join(root,'src/client/visual-artifacts/editor.ts'))resolved=path.join(evidence,'editor-before.ts.txt');
      if(!admitted.has(resolved))throw Error('UNADMITTED_IMPORT '+resolved);
      return {path:resolved};
    });
    b.onLoad({filter:/.*/},args=>{
      if(!admitted.has(args.path))throw Error('UNADMITTED_INPUT '+args.path);
      return {contents:fs.readFileSync(args.path,'utf8'),loader:args.path.endsWith('.json')?'json':'ts',resolveDir:args.path.endsWith('.ts.txt')?path.join(root,'src/client/visual-artifacts'):path.dirname(args.path)};
    });
  }};
  const result=await build({absWorkingDir:root,entryPoints:[entry],bundle:true,write:false,platform,format:platform==='node'?'esm':'iife',target:'es2022',define:{'import.meta.env.DEV':'false'},metafile:true,plugins:[plugin]});
  const key=entry+(before?':before':'');graphs[key]=result.metafile;
  fs.writeFileSync(path.join(out,'resolved-graphs.json'),JSON.stringify(graphs,null,2));
  fs.writeFileSync(path.join(out,path.basename(entry)+(before?'.before':'')+'.bundle.js'),result.outputFiles[0].text);
  return result.outputFiles[0].text;
}
try{
  for(const file of staticSources)await transform(fs.readFileSync(path.join(root,file.path),'utf8'),{loader:'ts',target:'es2022'});
  const adapter=fs.readFileSync(path.join(root,staticSources[0].path),'utf8'),coordinator=fs.readFileSync(path.join(root,staticSources[1].path),'utf8');
  assert(adapter.includes('savedCardTarget = editor.savedCardTarget'));assert(adapter.includes('subscribe: subscribeEditorSession'));assert(coordinator.includes('readonly savedCardTarget?: SavedCardTargetReader'));
  assert(!/parseSource|identifyRetainedSavedCard|parseMetadata/.test(adapter));
  fs.writeFileSync(path.join(out,'adapter-wiring-proof.json'),JSON.stringify({staticSources,adapterExecuted:false,coordinatorExecuted:false,sourceInterpretationOutsideOwner:false,additiveOptionalReader:true,originalSessionMetadata:true},null,2));
  const unit=path.join(out,'owner-target.test.mjs');fs.writeFileSync(unit,await compile('tests/saved-card-selection/owner-target.test.ts','node'));
  const env={...process.env};delete env.NODE_OPTIONS;delete env.NODE_PATH;
  const result=spawnSync(process.execPath,['--test','--test-concurrency=1',unit],{cwd:root,encoding:'utf8',env,timeout:30000});
  fs.writeFileSync(path.join(out,'unit-results.txt'),(result.stdout??'')+(result.stderr??''));assert.equal(result.status,0,result.stdout+result.stderr);
  // Scoped compiler API: inspect the complete source/type closure before diagnostics.
  const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,strict:true,skipLibCheck:true,noEmit:true,types:[],lib:['lib.es2022.d.ts','lib.dom.d.ts','lib.dom.iterable.d.ts'],paths:{'@ui-platform/visual-artifacts':[path.join(root,'tests/saved-card-selection/type-barrel.ts')],'@ui-platform/dataset-operations/expression':[expression]}};
  const host=ts.createCompilerHost(options);const read=host.readFile.bind(host);const typeReads=new Set();
  const libRoot=path.dirname(compilerRequire.resolve('typescript/lib/lib.es2022.d.ts'));
  host.readFile=file=>{const resolved=path.resolve(file);if(resolved.endsWith('.json'))return read(file);if(!admitted.has(resolved)&&!resolved.startsWith(libRoot+path.sep))throw Error('UNADMITTED_TYPE_INPUT '+resolved);typeReads.add(resolved);return read(file);};
  const program=ts.createProgram([path.join(root,'src/client/visual-artifacts/saved-card-target.ts'),path.join(root,'tests/saved-card-selection/snapshot-types.ts')],options,host);
  fs.writeFileSync(path.join(out,'typecheck-admission.json'),JSON.stringify({roots:program.getRootFileNames(),sourceFiles:program.getSourceFiles().map(f=>({path:f.fileName,sha256:hash(f.fileName)})),options},null,2));
  const diagnostics=ts.getPreEmitDiagnostics(program);fs.writeFileSync(path.join(out,'typecheck.txt'),ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:f=>f,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}));assert.equal(diagnostics.length,0,'Scoped typecheck failed');
  const after=await compile('tests/saved-card-selection/editor-harness.ts','browser');
  const before=await compile('tests/saved-card-selection/editor-harness.ts','browser',true);
  const {Window}=browserRequire('happy-dom');const observations=[],errors=[],network=[],frames=[];
  async function memoryEditor(code,enabled,configuration){
    const window=new Window({url:'http://memory.invalid',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:false}});
    let now=1000000,sequence=0;const timers=new Map();
    const schedule=(fn,ms,repeat)=>{const id=++sequence;timers.set(id,{fn,due:now+ms,repeat});return id;};
    const settle=async()=>{for(let i=0;i<10;i++)await new Promise(setImmediate);};
    const advance=async ms=>{const end=now+ms;for(;;){const next=[...timers].filter(([,t])=>t.due<=end).sort((a,b)=>a[1].due-b[1].due||a[0]-b[0])[0];if(!next)break;const [id,timer]=next;now=timer.due;if(timer.repeat)timer.due+=timer.repeat;else timers.delete(id);timer.fn();await settle();}now=end;await settle();};
    const failNetwork=()=>{network.push('unexpected');throw Error('UNEXPECTED_BACKEND');};
    window.fetch=failNetwork;
    let digestGate,releaseDigest=()=>{};
    const crypto={subtle:{async digest(...args){const wait=digestGate;if(wait)await wait;return webcrypto.subtle.digest(...args);}}};
    window.addEventListener('error',e=>errors.push(String(e.error??e.message)));
    const create=window.document.createElement.bind(window.document);window.document.createElement=(name,...args)=>{if(name.toLowerCase()==='iframe'){frames.push(-1);throw Error('UNEXPECTED_NATIVE_FRAME');}return create(name,...args);};
    class ClockDate extends Date { static now(){return now;} }
    // happy-dom lacks the browser's Option convenience constructor. Construct
    // its real option element; this shim is test platform support, not product.
    function Option(text='',value=text,defaultSelected=false,selected=false){const option=create('option');option.text=text;option.value=value;option.defaultSelected=defaultSelected;option.selected=selected;return option;}
    runInNewContext(code,{window,document:window.document,location:window.location,Element:window.Element,HTMLElement:window.HTMLElement,HTMLSelectElement:window.HTMLSelectElement,HTMLInputElement:window.HTMLInputElement,HTMLButtonElement:window.HTMLButtonElement,HTMLTextAreaElement:window.HTMLTextAreaElement,Option,Event:window.Event,CustomEvent:window.CustomEvent,Blob:window.Blob,URL:window.URL,console,structuredClone,crypto,TextEncoder,Date:ClockDate,fetch:failNetwork,setTimeout:(fn,ms)=>schedule(fn,ms,0),clearTimeout:id=>timers.delete(id),setInterval:(fn,ms)=>schedule(fn,ms,ms),clearInterval:id=>timers.delete(id)}, {filename:'admitted-actual-editor-bundle.js'});
    await window.selectionHarness.mount(enabled,configuration);await settle();
    const api=window.selectionHarness,plain=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
    return {api,advance,settle,rawTarget:()=>api.target(),target:()=>plain(api.target()),metrics:()=>plain(api.metrics()),snap:async()=>plain(await api.snapshot()),
      async until(predicate){for(let i=0;i<200;i++){if(await predicate())return;await settle();}throw Error('Expected owner transition did not occur: '+JSON.stringify(api.target()));},
      holdDigest(){digestGate=new Promise(resolve=>{releaseDigest=()=>{digestGate=undefined;resolve();};});},releaseDigest(){releaseDigest();},
      fill(value){const input=window.document.querySelector('[data-source]');input.value=value;input.dispatchEvent(new window.Event('input'));},
      click(selector){window.document.querySelector(selector).click();},range(start,end){window.document.querySelector('[data-source]').setSelectionRange(start,end);},
      async close(){releaseDigest();api.release();try{observations.push({target:plain(api.target()),metrics:plain(api.metrics())});await api.dispose();assert.equal(api.metrics().observers,0);assert.equal(timers.size,0,'Editor timers leaked');frames.push(window.document.querySelectorAll('iframe').length);}finally{await window.happyDOM.close();}}
    };
  }
  try{
    const {verifyEditor}=await import('../tests/saved-card-selection/editor-checks.mjs');
    const result=await verifyEditor((enabled,configuration={},useBefore=false)=>memoryEditor(useBefore?before:after,enabled,configuration),progress=>fs.writeFileSync(path.join(out,'editor-checkpoints.json'),JSON.stringify(progress,null,2)));
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);assert(frames.every(n=>n===0));
    fs.writeFileSync(path.join(out,'editor-results.json'),JSON.stringify({...result,errors,network,frames,observations},null,2));
  }finally{fs.writeFileSync(path.join(out,'editor-progress.json'),JSON.stringify({observations,errors,network,frames},null,2));}
  const changed=sources.filter(p=>hashes[path.relative(root,p).replaceAll('\\','/')]!==hash(p));assert.deepEqual(changed,[]);
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,serial:true,retries:0,typecheck:'strict owner helper and opaque immutable snapshot contract',executedSourceHashes:hashes},null,2));
  console.log('PASS '+out);
}catch(error){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(error),stack:error.stack},null,2));throw error;}
