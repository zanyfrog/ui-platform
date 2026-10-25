// Exact production-controller/shared-view verification; no normal root/backend execution.
import { build, transform } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const base='evidence/builder-v1-wp5-f-saved-preview-request-20261024';
const out=path.join(root,base,'run-'+Date.now());fs.mkdirSync(out);
const selected=['tests/preview-contract-model/saved-preview-request.test.ts','tests/fixture-preview/saved-preview-request-harness.ts'];
const sources = [
  ...['lifecycle.ts', 'samples.ts', 'protocol.ts', 'panel.ts', 'host.ts', 'bootstrap.txt'].map(p => `src/client/fixture-preview/${p}`),
  ...['context', 'working-copy', 'editing-lifecycle', 'autosave-configuration', 'session', 'transport', 'recovery', 'saved-source', 'source-editor'].map(p => `src/client/artifact-editor/${p}.ts`),
  ...['coordinator', 'fixture-preview-binding', 'shell-view', 'saved-preview-request'].map(p => `src/client/builder-workspace/${p}.ts`),
  'src/shared/saved-preview-request.ts', 'src/shared/artifact-editor.ts', 'src/shared/platform-settings.ts', 'src/shared/builder-workspace.ts',
  'packages/visual-artifacts/src/composition.ts', 'packages/visual-artifacts/src/source.ts', ...selected,
];

const admitted=new Set(sources.map(p=>path.resolve(root,p)));
const hashes=Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
fs.writeFileSync(path.join(out,'preflight.json'),JSON.stringify({selected,sources,hashes,serial:true,retries:0,setupHooks:[],workspaceConfiguration:false,closure:'Actual production view/controller + admitted editor stack, synthetic session/memory transport. Default transport/recovery paths inspected but never invoked; no source reader or native frame entry.'},null,2));
const plugin={name:'saved-request-exact-inputs',setup(b){b.onResolve({filter:/\.txt\?raw$/},a=>({path:path.resolve(a.resolveDir,a.path.replace('?raw',''))}));b.onLoad({filter:/.*/},a=>{if(!admitted.has(path.resolve(a.path)))throw Error('INPUT_NOT_ADMITTED '+a.path);return {contents:fs.readFileSync(a.path,'utf8'),loader:a.path.endsWith('.txt')?'text':'ts'};});}};
const graphs={};
async function compile(entry,platform){const r=await build({absWorkingDir:root,entryPoints:[entry],bundle:true,write:false,platform,format:platform==='node'?'esm':'iife',target:'es2022',define:{'import.meta.env.DEV':'false'},metafile:true,plugins:[plugin]});graphs[entry]=r.metafile;return r.outputFiles[0].text;}
const unitFile=path.join(out,'saved-preview-request.test.mjs');fs.writeFileSync(unitFile,await compile(selected[0],'node'));
const env={...process.env};delete env.NODE_OPTIONS;delete env.NODE_PATH;
const unit=spawnSync(process.execPath,['--test','--test-concurrency=1',unitFile],{cwd:root,encoding:'utf8',env,timeout:30000});fs.writeFileSync(path.join(out,'unit-results.txt'),(unit.stdout??'')+(unit.stderr??''));assert.equal(unit.status,0,unit.stdout+unit.stderr);
const harness=await compile(selected[1],'browser');
await transform(fs.readFileSync(path.join(root,'src/client/builder-workspace/shell.ts'),'utf8'),{loader:'ts',target:'es2022'});
fs.writeFileSync(path.join(out,'dependency-graphs.json'),JSON.stringify(graphs,null,2));
const production=fs.readFileSync(path.join(root,'src/client/builder-workspace/shell.ts'),'utf8'),testHarness=fs.readFileSync(path.join(root,selected[1]),'utf8');
assert(production.includes('const savedPreview = new SavedPreviewRequestController()'));assert(production.includes('}, savedPreview)'));assert(testHarness.includes('}, savedPreview)'));
for(const file of ['src/client/builder-workspace/shell-view.ts','src/client/builder-workspace/saved-preview-request.ts'])assert(graphs[selected[1]].inputs[file]);
fs.writeFileSync(path.join(out,'production-module-proof.json'),JSON.stringify({productionRootExecuted:false,productionControllerConstruction:true,productionAndHarnessPassControllerToSameView:true,viewHash:hashes['src/client/builder-workspace/shell-view.ts'],controllerHash:hashes['src/client/builder-workspace/saved-preview-request.ts'],contractHash:hashes['src/shared/saved-preview-request.ts'],executedHarnessGraph:graphs[selected[1]]},null,2));
const css=fs.readFileSync(path.join(root,'src/client/builder-workspace/workspace.css'),'utf8');
const routes=new Map([['/',{type:'text/html',body:'<!doctype html><html><head><link rel="icon" href="data:,"><style>'+css+'</style></head><body><script src="/harness.js"></script></body></html>'}],['/harness.js',{type:'text/javascript',body:harness}]]);
const serverRequests=[],requests=[],errors=[],consoleMessages=[],failures=[],downloads=[],choosers=[],navigations=[];
const server=createServer((req,res)=>{serverRequests.push({url:req.url,method:req.method,cookie:req.headers.cookie??null,authorization:req.headers.authorization??null});const r=req.method==='GET'&&routes.get(req.url);res.writeHead(r?200:405,{'Content-Type':r?r.type:'text/plain','Cache-Control':'no-store'});res.end(r?r.body:'DENIED');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const playwright=createRequire(path.resolve(root,'../ui-base/package.json'))('playwright');let browser;const checks=[],observations={};
try{
  browser=await playwright.chromium.launch({headless:true,channel:'msedge'});observations.browserVersion=browser.version();
  const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:false});
  await context.addInitScript(()=>{window.__frameAttempts=0;const create=document.createElement.bind(document);document.createElement=function(name,...args){if(String(name).toLowerCase()==='iframe'){window.__frameAttempts++;throw Error('UNEXPECTED_NATIVE_FRAME');}return create(name,...args);};});
  async function newPage(){
    const p=await context.newPage();p.on('request',r=>requests.push({url:r.url(),method:r.method()}));p.on('requestfailed',r=>failures.push({url:r.url(),reason:r.failure()?.errorText}));p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>consoleMessages.push({type:m.type(),text:m.text()}));p.on('download',d=>downloads.push(d.suggestedFilename()));p.on('filechooser',()=>choosers.push(true));p.on('framenavigated',f=>navigations.push({main:f===p.mainFrame(),url:f.url()}));
    await p.goto(origin);await p.waitForFunction(()=>window.editingHarness);await p.clock.install({time:1000000});await p.clock.pauseAt(1000100);return p;
  }
  const capture=p=>p.evaluate(()=>window.editingHarness.snapshot());
  const focus=p=>p.evaluate(()=>window.editingHarness.focusSource());
  const saved=p=>p.evaluate(()=>window.editingHarness.savedState());
  const button=p=>p.getByRole('button',{name:'Check saved Preview availability',exact:true});
  async function check(p){await button(p).click();await p.waitForFunction(()=>window.editingHarness.savedState().outcome!==null);return saved(p);}
  async function nav(p,name){await p.getByRole('navigation',{name:'Application artifacts'}).getByRole('button',{name:'Synthetic '+name,exact:true}).click();await p.evaluate(()=>window.editingHarness.idle());}
  async function tab(p,name){await p.getByRole('tab',{name:new RegExp('^Synthetic '+name)}).click();await p.evaluate(()=>window.editingHarness.idle());}
  const page=await newPage();
  const initial=await saved(page);assert.equal(initial.selection.identity.id,'synthetic-one');assert.equal(initial.selection.identity.owner.id,'synthetic-permanent-app');assert.equal(initial.selection.subjectId,'synthetic-subject');assert.equal(initial.selection.sessionRevision,'synthetic-session');
  await page.getByLabel('Source for two.txt',{exact:true}).fill('saved-readiness dirty draft');await page.clock.runFor(751);await page.getByLabel('Source for two.txt',{exact:true}).fill('saved-readiness redo candidate');await page.evaluate(()=>window.editingHarness.userUndo());await page.evaluate(()=>{document.querySelector('.artifact-source-editor').setSelectionRange(2,9);window.retainedEditor=document.querySelector('[data-stage]').firstElementChild;});await focus(page);
  const before=await capture(page),sessionCallsBefore=await page.evaluate(()=>window.editingHarness.sessionCalls.length);const result=await check(page);await focus(page);
  assert.equal(result.outcome.kind,'unavailable');assert.equal(result.outcome.code,'UNSUPPORTED_ARTIFACT');assert.equal(result.selection.dirty,true);assert.deepEqual(await capture(page),before);assert.equal(await page.evaluate(()=>window.editingHarness.sessionCalls.length),sessionCallsBefore);assert.match(await page.locator('[data-saved-preview-status]').textContent(),/Unsaved changes are excluded/);assert.equal(await page.evaluate(()=>window.retainedEditor===document.querySelector('[data-stage]').firstElementChild),true);
  observations.actualAction={before,after:await capture(page),readiness:result};checks.push('Actual production shared controller/view action reports unavailable with original subject/session/Application/owner identity and preserves dirty source, file/range/checksum/history and editor DOM');
  await page.evaluate(()=>window.editingHarness.holdSaved());await button(page).click();assert.equal((await saved(page)).state,'pending');await nav(page,'two');await page.evaluate(()=>window.editingHarness.releaseSaved());await page.waitForFunction(()=>window.editingHarness.savedState().state!=='pending');assert.equal((await saved(page)).selection.identity.id,'synthetic-two');assert.equal((await saved(page)).outcome,null);await check(page);
  await tab(page,'one');await focus(page);assert.deepEqual(await capture(page),before);
  await page.evaluate(()=>window.editingHarness.holdSaved());await button(page).click();await page.evaluate(()=>{window.editingHarness.sourceChanged();window.editingHarness.releaseSaved();});assert.equal((await saved(page)).outcome,null);assert.equal((await saved(page)).state,'idle');
  checks.push('Actual tab/navigation and source-change invalidation cancel pending completion; old identity/outcome cannot return');
  await page.evaluate(()=>window.editingHarness.holdSaved());await button(page).click();await page.evaluate(()=>{window.editingHarness.park();window.editingHarness.releaseSaved();});assert.equal((await saved(page)).state,'parked');assert.equal((await saved(page)).selection,null);await page.evaluate(()=>window.editingHarness.remount());await tab(page,'one');await focus(page);assert.deepEqual(await capture(page),before);assert.equal((await saved(page)).outcome,null);
  await page.locator('[data-fixture]').selectOption('panel');
  // Editing fixture sample input is allowed; Refresh/native rendering is deliberately never invoked.
  await page.evaluate(()=>window.editingHarness.panel.invalidate('READINESS_FIXTURE_PRESERVATION_CHECK'));const fixtureBefore=await page.locator('[aria-label="Fixture Preview"]').textContent();await check(page);assert.equal(await page.locator('[aria-label="Fixture Preview"]').textContent(),fixtureBefore);assert.equal(await page.locator('iframe').count(),0);
  await page.screenshot({path:path.join(out,'production-saved-readiness.png')});
  assert.equal((await capture(page)).editor.canRedo,true);await page.evaluate(()=>window.editingHarness.userRedo());assert.equal((await capture(page)).sourceText,'saved-readiness redo candidate');await page.evaluate(()=>window.editingHarness.userUndo());assert.equal((await capture(page)).sourceText,before.sourceText);assert.equal((await capture(page)).editor.canRedo,true);
  observations.undoRedoAfterChecks=await capture(page);
  await page.evaluate(()=>window.editingHarness.suspendSession());assert.equal((await saved(page)).state,'suspended');assert.equal((await saved(page)).selection,null);assert.equal(await button(page).isDisabled(),true);assert.equal(await page.locator('[data-stage]').locator('article').count(),0);
  await page.evaluate(()=>window.editingHarness.cleanup());assert.equal((await saved(page)).state,'disposed');assert.equal((await page.evaluate(()=>window.editingHarness.metrics())).activeViewClickListeners,0);
  checks.push('Park/remount, simulated session suspension, terminal disposal and unchanged fixture controls; no native frame or default callback');
  const comparisons={};
  for(const enabled of [false,true]){
    const traces=[];
    for(const withCheck of [false,true]){
      const p=await newPage();await p.evaluate(enabled=>{window.editingHarness.configure(enabled);if(enabled)window.editingHarness.hold();},enabled);const start=await p.evaluate(()=>Date.now());
      await p.getByLabel('Source for two.txt',{exact:true}).fill('matched readiness autosave candidate');await p.evaluate(()=>document.querySelector('.artifact-source-editor').setSelectionRange(2,9));
      await p.clock.runFor(1000);if(withCheck)await check(p);await focus(p);
      await p.clock.runFor(999);assert.equal((await capture(p)).saves.length,0);await p.clock.runFor(1);assert.equal((await capture(p)).saves.length,enabled?1:0);
      if(enabled)assert.equal((await capture(p)).editor.saveState,'saving');if(withCheck)await check(p);await focus(p);
      await nav(p,'two');await tab(p,'one');const pending=await capture(p);assert.deepEqual(pending.mutationCalls,[]);
      await p.evaluate(()=>window.editingHarness.park());await p.evaluate(()=>window.editingHarness.remount());await tab(p,'one');
      await p.clock.runFor(500);if(enabled)await p.evaluate(()=>window.editingHarness.release());else await p.clock.runFor(10000);
      const settled=await capture(p),metrics=await p.evaluate(()=>window.editingHarness.metrics());assert.equal(settled.saves.length,enabled?1:0);assert.deepEqual(metrics.unexpected,[]);assert.equal(await p.evaluate(()=>window.__frameAttempts),0);
      if(enabled){assert.equal(settled.saves[0].time-start,2000);assert.equal(settled.editor.dirty,false);}
      traces.push({pending:{...pending,saves:pending.saves.map(s=>({...s,time:s.time-start}))},settled:{...settled,saves:settled.saves.map(s=>({...s,time:s.time-start}))},actions:metrics.actions});
      await p.evaluate(()=>window.editingHarness.cleanup());await p.close();
    }
    assert.deepEqual(traces[1],traces[0]);comparisons[enabled?'enabled':'disabled']=traces;
  }
  observations.autosaveComparisons=comparisons;checks.push('Matched no-check/check traces: zero disabled saves; one enabled save at exactly 2000ms, including pending-save checks and navigation/park/remount with identical source/checksum/history/identity/file/range/callback traces');
  assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(downloads.length,0);assert.equal(choosers.length,0);assert(serverRequests.every(r=>r.method==='GET'&&routes.has(r.url)&&r.cookie===null&&r.authorization===null));assert(navigations.filter(n=>n.main).every(n=>n.url===origin+'/'));
  assert.equal(await page.evaluate(()=>window.__frameAttempts),0);assert.deepEqual(await page.evaluate(()=>window.editingHarness.unexpected),[]);
  checks.push('Receiving server observes only exact memory assets, no saved-source/backend/authenticated requests, no native frames or unexpected service/editor/default-adapter effects');
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:true,checks,observations,serverRequests,requests,errors,failures,consoleMessages,downloads,choosers,navigations,limits:'Identical production view/controller with real admitted editors and memory transports; normal production root/services not executed. Readiness only, permanently unavailable; no source/authority/rendering qualification.'},null,2));
  const changed=sources.filter(p=>hashes[p]!==createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex'));assert.deepEqual(changed,[]);fs.writeFileSync(path.join(out,'verified-source-hashes.json'),JSON.stringify(hashes,null,2));
  console.log('PASS '+checks.length+' browser checkpoints: '+out);
}catch(error){fs.writeFileSync(path.join(out,'browser-failure.json'),JSON.stringify({error:String(error),stack:error.stack,checks,observations,serverRequests,requests,errors,failures,consoleMessages},null,2));throw error;}
finally{await browser?.close();await new Promise(r=>server.close(r));}
