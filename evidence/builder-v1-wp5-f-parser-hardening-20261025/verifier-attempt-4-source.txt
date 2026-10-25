// Exact source-only parser/validation + nonpersisting actual-editor verification.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const root=path.resolve(import.meta.dirname,'..');
const evidence=path.join(root,'evidence/builder-v1-wp5-f-parser-hardening-20261025');
const out=path.join(evidence,'run-'+Date.now());fs.mkdirSync(out);
const expression=path.resolve(root,'../UI Platform Data Services/packages/dataset-operations/src/declarative-expression.ts');
const manifest=path.resolve(root,'../ui-base/packages/ui-base-ui/ui.component.json');
const sources=[
  ...['source','validation','model','form','expression','composition'].map(n=>`packages/visual-artifacts/src/${n}.ts`),
  ...['editor','menu-controls','authoring-controls'].map(n=>`src/client/visual-artifacts/${n}.ts`),
  ...['editing-lifecycle','autosave-configuration','specialized-transport','saved-source'].map(n=>`src/client/artifact-editor/${n}.ts`),
  'src/shared/platform-settings.ts',
  ...['parser-hardening.test.ts','editor-regression-harness.ts','visual-source-barrel.ts'].map(n=>`tests/source-identity/${n}`),
  'evidence/builder-v1-wp5-f-parser-hardening-20261025/source-before.ts.txt',
  'evidence/builder-v1-wp5-f-parser-hardening-20261025/validation-before.ts.txt',
].map(p=>path.resolve(root,p)).concat(expression,manifest);
const admitted=new Set(sources);
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const hashes=Object.fromEntries(sources.map(p=>[path.relative(root,p).replaceAll('\\','/'),hash(p)]));
const toolRequire=createRequire(import.meta.url);
const compilerRequire=createRequire(path.resolve(root,'packages/artifacts/package.json'));
const ts=compilerRequire('typescript');
const browserRequire=createRequire(path.resolve(root,'../ui-base/package.json'));
const tools={node:process.version,esbuild:{entry:toolRequire.resolve('esbuild'),version:toolRequire('esbuild/package.json').version},typescript:{entry:compilerRequire.resolve('typescript'),version:ts.version},dom:{entry:browserRequire.resolve('happy-dom'),version:browserRequire('happy-dom/package.json').version}};
fs.writeFileSync(path.join(out,'admission.json'),JSON.stringify({sources,hashes,tools,serial:true,retries:0,setupHooks:[],workspaceConfig:false,entrypoints:['parser-hardening.test.ts','editor-regression-harness.ts'],forbidden:['package runtime index','session execution','backend','protected source','native rendering'],data:'Authored memory sources and exact package declaration JSON only'},null,2));
const graphs={};
async function compile(entry,platform,before=false){
  const plugin={name:'exact-identity-source-inputs',setup(b){
    b.onResolve({filter:/.*/},args=>{
      if(args.path.startsWith('node:')){assert.equal(platform,'node');return {path:args.path,external:true};}
      let resolved;
      if(args.path==='before-source')resolved=path.join(evidence,'source-before.ts.txt');
      else if(args.path==='@ui-platform/visual-artifacts')resolved=path.join(root,'tests/source-identity/visual-source-barrel.ts');
      else if(args.path==='@ui-platform/dataset-operations/expression')resolved=expression;
      else resolved=path.resolve(args.resolveDir||root,args.path);
      if(resolved.endsWith('.js')&&!fs.existsSync(resolved))resolved=resolved.slice(0,-3)+'.ts';
      if(before&&resolved===path.join(root,'packages/visual-artifacts/src/source.ts'))resolved=path.join(evidence,'source-before.ts.txt');
      if(before&&resolved===path.join(root,'packages/visual-artifacts/src/validation.ts'))resolved=path.join(evidence,'validation-before.ts.txt');
      if(!admitted.has(resolved))throw Error('UNADMITTED_IMPORT '+resolved);
      return {path:resolved};
    });
    b.onLoad({filter:/.*/},args=>{
      if(!admitted.has(args.path))throw Error('UNADMITTED_INPUT '+args.path);
      // Saved before-source's relative type edge is erased. Before-validation's
      // runtime edges resolve from the same original source directory.
      return {contents:fs.readFileSync(args.path,'utf8'),loader:args.path.endsWith('.json')?'json':'ts',resolveDir:args.path.endsWith('.ts.txt')?path.join(root,'packages/visual-artifacts/src'):path.dirname(args.path)};
    });
  }};
  const result=await build({absWorkingDir:root,entryPoints:[entry],bundle:true,write:false,platform,format:platform==='node'?'esm':'iife',target:'es2022',define:{'import.meta.env.DEV':'false'},metafile:true,plugins:[plugin]});
  const key=entry+(before?':before':'');graphs[key]=result.metafile;
  fs.writeFileSync(path.join(out,'resolved-graphs.json'),JSON.stringify(graphs,null,2));
  return result.outputFiles[0].text;
}
try{
  const unit=path.join(out,'parser-hardening.test.mjs');fs.writeFileSync(unit,await compile('tests/source-identity/parser-hardening.test.ts','node'));
  const env={...process.env};delete env.NODE_OPTIONS;delete env.NODE_PATH;
  const result=spawnSync(process.execPath,['--test','--test-concurrency=1',unit],{cwd:root,encoding:'utf8',env,timeout:30000});
  fs.writeFileSync(path.join(out,'unit-results.txt'),(result.stdout??'')+(result.stderr??''));assert.equal(result.status,0,result.stdout+result.stderr);
  // Scoped compiler API: inspect the complete source/type closure before diagnostics.
  const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,strict:true,skipLibCheck:true,noEmit:true,types:[],lib:['lib.es2022.d.ts','lib.dom.d.ts','lib.dom.iterable.d.ts'],paths:{'@ui-platform/dataset-operations/expression':[expression]}};
  const host=ts.createCompilerHost(options);const read=host.readFile.bind(host);const typeReads=new Set();
  const libRoot=path.dirname(compilerRequire.resolve('typescript/lib/lib.es2022.d.ts'));
  host.readFile=file=>{const resolved=path.resolve(file);if(resolved.endsWith('.json'))return read(file);if(!admitted.has(resolved)&&!resolved.startsWith(libRoot+path.sep))throw Error('UNADMITTED_TYPE_INPUT '+resolved);typeReads.add(resolved);return read(file);};
  const program=ts.createProgram([path.join(root,'packages/visual-artifacts/src/source.ts'),path.join(root,'packages/visual-artifacts/src/validation.ts')],options,host);
  fs.writeFileSync(path.join(out,'typecheck-admission.json'),JSON.stringify({roots:program.getRootFileNames(),sourceFiles:program.getSourceFiles().map(f=>({path:f.fileName,sha256:hash(f.fileName)})),options},null,2));
  const diagnostics=ts.getPreEmitDiagnostics(program);fs.writeFileSync(path.join(out,'typecheck.txt'),ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:f=>f,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}));assert.equal(diagnostics.length,0,'Scoped typecheck failed');
  const after=await compile('tests/source-identity/editor-regression-harness.ts','browser');
  const before=await compile('tests/source-identity/editor-regression-harness.ts','browser',true);
  const {Window}=browserRequire('happy-dom');const traces=[],errors=[],network=[],frames=[];
  async function memoryEditor(code,enabled){
    const window=new Window({url:'http://memory.invalid',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:false}});
    let now=1000000,sequence=0;const timers=new Map();
    const schedule=(fn,ms,repeat)=>{const id=++sequence;timers.set(id,{fn,due:now+ms,repeat});return id;};
    const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
    const advance=async ms=>{const end=now+ms;for(;;){const next=[...timers].filter(([,t])=>t.due<=end).sort((a,b)=>a[1].due-b[1].due||a[0]-b[0])[0];if(!next)break;const [id,timer]=next;now=timer.due;if(timer.repeat)timer.due+=timer.repeat;else timers.delete(id);timer.fn();await settle();}now=end;await settle();};
    const failNetwork=()=>{network.push('unexpected');throw Error('UNEXPECTED_BACKEND');};
    window.fetch=failNetwork;window.memoryDigest=async text=>createHash('sha256').update(text).digest('hex');
    window.addEventListener('error',e=>errors.push(String(e.error??e.message)));
    const create=window.document.createElement.bind(window.document);window.document.createElement=(name,...args)=>{if(name.toLowerCase()==='iframe'){frames.push(-1);throw Error('UNEXPECTED_NATIVE_FRAME');}return create(name,...args);};
    class ClockDate extends Date { static now(){return now;} }
    // happy-dom lacks the browser's Option convenience constructor. Construct
    // its real option element; this shim is test platform support, not product.
    function Option(text='',value=text,defaultSelected=false,selected=false){const option=create('option');option.text=text;option.value=value;option.defaultSelected=defaultSelected;option.selected=selected;return option;}
    runInNewContext(code,{window,document:window.document,location:window.location,Element:window.Element,HTMLElement:window.HTMLElement,Option,Event:window.Event,CustomEvent:window.CustomEvent,Blob:window.Blob,URL:window.URL,console,structuredClone,Date:ClockDate,fetch:failNetwork,setTimeout:(fn,ms)=>schedule(fn,ms,0),clearTimeout:id=>timers.delete(id),setInterval:(fn,ms)=>schedule(fn,ms,ms),clearInterval:id=>timers.delete(id)}, {filename:'admitted-actual-editor-bundle.js'});
    await window.parserHarness.mount(enabled);await settle();
    return {window,advance,settle,snap:async()=>JSON.parse(JSON.stringify(await window.parserHarness.snapshot())),fill(value){const input=window.document.querySelector('[data-source]');input.value=value;input.dispatchEvent(new window.Event('input'));},click(selector){window.document.querySelector(selector).click();},async close(){await window.parserHarness.dispose();assert.equal(timers.size,0,'Editor timers leaked');await window.happyDOM.close();}};
  }
  try{
    for(const enabled of [false,true]){
      const pair=[];
      for(const code of [before,after]){
        const editor=await memoryEditor(code,enabled);
        try{
          const initial=await editor.snap();editor.window.parserHarness.selectSaved();
          editor.fill(initial.source.replace('Saved text','First edit'));await editor.advance(751);
          editor.fill(initial.source.replace('Saved text','Second edit'));const edited=await editor.snap();
          editor.click('[data-undo]');await editor.settle();assert.equal((await editor.snap()).source,initial.source.replace('Saved text','First edit'));
          editor.click('[data-redo]');await editor.settle();assert.equal((await editor.snap()).source,edited.source);
          editor.window.document.querySelector('[data-source]').setSelectionRange(3,11);
          const preSave=await editor.snap();await editor.advance(1999);assert.equal((await editor.snap()).calls.length,0);await editor.advance(1);
          const settled=await editor.snap();assert.equal(settled.calls.length,enabled?1:0);assert.deepEqual(settled.range,[3,11]);assert.equal(settled.source,edited.source);assert.equal(settled.file,'source');
          if(enabled){assert.equal(settled.calls[0].time,2751);assert.equal(settled.state.pending,false);assert.equal(settled.state.dirty,false);}
          pair.push({initial,edited,preSave,settled});frames.push(editor.window.document.querySelectorAll('iframe').length);
        }finally{await editor.close();}
      }
      assert.deepEqual(pair[1],pair[0]);traces.push({enabled,before:pair[0],after:pair[1]});
    }
    const editor=await memoryEditor(after,false);let refused;
    try{
      editor.fill('<div data-uip-node="first" data-uip-node="last"></div>');refused=await editor.snap();assert(refused.ids.every(id=>id.startsWith('manual:')));assert.match(editor.window.document.querySelector('[data-diagnostics]').textContent,/Duplicate identity attribute/);
    }finally{await editor.close();}
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);assert(frames.every(n=>n===0));
    fs.writeFileSync(path.join(out,'editor-regression.json'),JSON.stringify({passed:true,traces,refused,errors,network,frames,scope:'Actual unchanged Visual editor in happy-dom, deterministic admitted clock and authored memory transport; no native browser/persistence/backend/rendering qualification'},null,2));
  }finally{fs.writeFileSync(path.join(out,'editor-progress.json'),JSON.stringify({traces,errors,network,frames},null,2));}
  const changed=sources.filter(p=>hashes[path.relative(root,p).replaceAll('\\','/')]!==hash(p));assert.deepEqual(changed,[]);
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,serial:true,retries:0,typecheck:'strict scoped parser/validation closure',executedSourceHashes:hashes},null,2));
  console.log('PASS '+out);
}catch(error){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(error),stack:error.stack},null,2));throw error;}
