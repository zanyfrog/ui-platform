import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),base='evidence/builder-v1-wp5-f-l3b-20261024';
const admission=JSON.parse(fs.readFileSync(path.join(root,base,'native-admission-before-code.json')));
const hash=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
for(const [p,v]of Object.entries(admission.files))assert.equal(hash(fs.readFileSync(p)).slice(7),v.sha256,'NATIVE_BYTES_CHANGED');
for(const p of Object.values(admission.packages))assert.equal(hash(fs.readFileSync(path.join(p.root,'package.json'))).slice(7),p.sha256);
assert.equal(hash(fs.readFileSync(admission.manifest.path)).slice(7),admission.manifest.sha256);
const closure=hash(canonical({files:Object.entries(admission.files).map(([p,v])=>[p,v.sha256]).sort(),packages:admission.packages,manifest:admission.manifest}));
const definition=JSON.parse(fs.readFileSync(admission.manifest.path)).components.find(c=>c.schemaVersion==='1.0.0');
const definitionDigest=hash(canonical(definition));
const sources=[...['admission','host','message','frame'].map(n=>`src/client/native-card-preview/${n}.ts`),'tests/fixture-preview/native-card-probe.js','tests/fixture-preview/native-card-inputs.ts','tests/fixture-preview/native-card-capture-harness.ts','tests/preview-contract-model/native-card-admission.test.ts',
 ...['host.ts','lifecycle.ts','protocol.ts','samples.ts','bootstrap.txt'].map(n=>'src/client/fixture-preview/'+n),'packages/visual-artifacts/src/composition.ts','packages/visual-artifacts/src/source.ts'];
const allowed=new Set([...sources.map(p=>path.resolve(root,p)),...Object.keys(admission.files),admission.manifest.path].map(p=>fs.realpathSync(p).toLowerCase()));
const hashes=Object.fromEntries(sources.map(p=>[p,hash(fs.readFileSync(path.join(root,p)))]));
const out=path.join(root,base,`run-${Date.now()}`);fs.mkdirSync(out);
fs.writeFileSync(path.join(out,'preflight.json'),JSON.stringify({sources,hashes,native:admission,closureDigest:closure,definitionDigest,serial:true,retries:0,setupHooks:[],workspaceConfiguration:false,execution:'One unit entry; native frame, new harness and unchanged old fixture smoke only. No backend/Builder/Visual/Form.'},null,2));
const plugin={name:'exact-native-inputs',setup(b){b.onResolve({filter:/\.txt\?raw$/},a=>({path:path.resolve(a.resolveDir,a.path.replace('?raw',''))}));b.onLoad({filter:/.*/},a=>{const p=fs.realpathSync(a.path);if(!allowed.has(p.toLowerCase()))throw Error('NOT_ADMITTED '+p);return {contents:fs.readFileSync(p,'utf8'),loader:p.endsWith('.json')?'json':p.endsWith('.txt')?'text':p.endsWith('.ts')?'ts':'js'};});}};
const graphs={};
async function compile(entry,platform,format,extra={}){const result=await build({absWorkingDir:root,entryPoints:[entry],bundle:true,write:false,platform,format,target:'es2022',keepNames:true,metafile:true,plugins:[plugin],define:{PINNED_CLOSURE:JSON.stringify(closure),PINNED_DEFINITION:JSON.stringify(definitionDigest),...extra}});graphs[entry]=result.metafile;return result.outputFiles[0].text;}
const unit=await compile('tests/preview-contract-model/native-card-admission.test.ts','node','esm');
const unitFile=path.join(out,'native-card-admission.test.mjs');fs.writeFileSync(unitFile,unit);
const env={...process.env};delete env.NODE_OPTIONS;delete env.NODE_PATH;
const result=spawnSync(process.execPath,['--test','--test-concurrency=1',unitFile],{cwd:root,encoding:'utf8',env,timeout:30000});
fs.writeFileSync(path.join(out,'unit-results.txt'),(result.stdout??'')+(result.stderr??''));assert.equal(result.status,0,result.stdout+result.stderr);
const bootstrap=(fs.readFileSync(path.join(root,'tests/fixture-preview/native-card-probe.js'),'utf8')+'\n'+await compile('src/client/native-card-preview/frame.ts','browser','iife')).replace(/<\/script/gi,'<\\/script');
const harness=await compile('tests/fixture-preview/native-card-capture-harness.ts','browser','esm',{NATIVE_BOOTSTRAP:JSON.stringify(bootstrap)});
fs.writeFileSync(path.join(out,'dependency-graphs.json'),JSON.stringify(graphs,null,2));fs.writeFileSync(path.join(out,'bundle-identity.json'),JSON.stringify({bundleDigest:hash(bootstrap),definitionDigest,closureDigest:closure},null,2));
const serverRequests=[],requests=[],failures=[],errors=[],consoleMessages=[],downloads=[],choosers=[],navigations=[];
const routes=new Map([['/',{type:'text/html',body:'<!doctype html><html><head><link rel="icon" href="data:,"></head><body><script type="module" src="/harness.js"></script></body></html>'}],['/harness.js',{type:'text/javascript',body:harness}]]);
const server=createServer((req,res)=>{serverRequests.push({url:req.url,method:req.method,cookie:req.headers.cookie??null,authorization:req.headers.authorization??null});const r=req.method==='GET'&&routes.get(req.url);res.writeHead(r?200:405,{'Content-Type':r?r.type:'text/plain','Cache-Control':'no-store'});res.end(r?r.body:'DENIED');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const playwright=createRequire(path.resolve(root,'../ui-base/package.json'))('playwright');let browser;
const checks=[],observations={};
try{
  browser=await playwright.chromium.launch({headless:true,channel:'msedge'});observations.browserVersion=browser.version();
  const context=await browser.newContext({acceptDownloads:false,viewport:{width:1200,height:900}});
  const page=await context.newPage();page.on('request',r=>requests.push({url:r.url(),method:r.method(),resource:r.resourceType()}));page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>consoleMessages.push({type:m.type(),text:m.text()}));page.on('download',d=>downloads.push(d.suggestedFilename()));page.on('filechooser',()=>choosers.push(true));page.on('framenavigated',f=>navigations.push({main:f===page.mainFrame(),url:f.url()}));
  await page.goto(origin);await page.waitForFunction(()=>window.nativeHarness);
  assert.equal(await page.evaluate(()=>window.nativeHarness.rawInvalid()),'CAPABILITY_DENIED');
  const raw=page.frames().find(f=>f!==page.mainFrame());assert(raw);observations.rejectedBeforeConstruction=await raw.evaluate(()=>({metrics:window.__nativeMetrics,card:!!document.querySelector('uib-card')}));
  assert.equal(observations.rejectedBeforeConstruction.metrics.cards,0);assert.equal(observations.rejectedBeforeConstruction.card,false);assert.equal(observations.rejectedBeforeConstruction.metrics.registrations.length,13);await page.locator('iframe').evaluateAll(nodes=>nodes.forEach(n=>n.remove()));
  checks.push('Invalid transit input rejected after fixed 13-tag registration but before any native Card construction');
  const refresh=settings=>page.evaluate(s=>window.nativeHarness.refresh(s),settings??{});
  const frame=()=>page.frames().find(f=>f!==page.mainFrame());
  assert.equal(await refresh(),true);let f=frame();assert(f);
  observations.nativeIdentity=await f.evaluate(()=>{const c=document.querySelector('uib-card');return {constructor:c.constructor.name,registered:c.constructor===customElements.get('uib-card'),body:c.textContent,metrics:window.__nativeMetrics,csp:document.querySelector('meta[http-equiv]').content};});
  assert.equal(observations.nativeIdentity.constructor,'UibCard');assert.equal(observations.nativeIdentity.registered,true);assert.equal(observations.nativeIdentity.body,'Card body');assert.equal(observations.nativeIdentity.metrics.cards,1);
  checks.push('Actual canonical Definition and registered unchanged UibCard constructor; native defaults');
  for(const variant of ['elevated','outlined','flat'])for(const density of ['comfortable','compact']){
    assert.equal(await refresh({body:'Authored body',header:'Header',footer:'Footer',heading:'Heading',label:'Label',ariaLabel:'Accessible Card',variant,density,interactionMode:'selectable'}),true);f=frame();
    assert.equal(await f.locator('uib-card').getAttribute('variant'),variant);assert.equal(await f.locator('uib-card').getAttribute('density'),density);assert.equal(await f.locator('uib-card').getAttribute('aria-label'),'Accessible Card');assert.equal(await f.locator('uib-card > [slot=header]').textContent(),'Header');assert.equal(await f.locator('uib-card > [slot=footer]').textContent(),'Footer');
  }
  await f.evaluate(()=>{window.events=[];const c=document.querySelector('uib-card');for(const type of ['change','uib-card-select','uib-card-action'])c.addEventListener(type,e=>window.events.push(e.type));});
  await f.locator('uib-card').locator('.uib-card').click();assert.equal(await f.locator('uib-card').getAttribute('selected'),'');assert.deepEqual(await f.evaluate(()=>window.events),['change','uib-card-select']);
  await f.locator('uib-card').locator('.uib-card').press('Enter');assert.equal(await f.locator('uib-card').getAttribute('selected'),null);
  assert.equal(await refresh({interactionMode:'selectable',disabled:true,body:'Disabled',ariaLabel:'Disabled Card'}),true);f=frame();await f.locator('uib-card').locator('.uib-card').click({force:true});assert.equal(await f.locator('uib-card').getAttribute('selected'),null);
  await page.screenshot({path:path.join(out,'canonical-card-native.png')});checks.push('Native slots, six variant/density combinations, accessibility, selection event order/keyboard and disabled behavior');
  for(const settings of [{href:'https://denied.invalid'},{mediaSrc:'https://denied.invalid'},{actionHandler:'forbidden'},{serviceRefs:{}},{children:['div']},{interactionMode:'link'}]){assert.equal(await refresh(settings),false);assert.equal(await page.locator('iframe').count(),0);}
  checks.push('Prohibited capabilities refused in parent before any new frame/Card, failed Refresh leaves static stale summary');
  await page.evaluate(()=>window.nativeHarness.reset());assert.equal(await page.evaluate(()=>window.nativeHarness.race()),false);assert.equal(await page.locator('iframe').count(),0);
  await page.evaluate(()=>window.nativeHarness.reset());assert.equal(await refresh({interactionMode:'selectable',ariaLabel:'Cleanup Card'}),true);f=frame();
  observations.cleanupBefore=await f.evaluate(()=>window.__nativeMetrics);await f.evaluate(()=>document.querySelector('uib-card').remove());observations.nativeDisconnected=await f.evaluate(()=>window.__nativeMetrics);assert.equal(observations.nativeDisconnected.activeObservers,0);assert(observations.nativeDisconnected.disconnects>0);
  const removed=f;await Promise.all([page.waitForEvent('framedetached',{predicate:detached=>detached===removed}),page.evaluate(()=>window.nativeHarness.stale())]);assert(removed.isDetached());assert.equal(await page.locator('iframe').count(),0);assert.deepEqual(await page.evaluate(()=>({l:window.nativeHarness.metrics().listeners,t:window.nativeHarness.metrics().timers})),{l:0,t:0});
  for(let i=0;i<3;i++){await page.evaluate(()=>window.nativeHarness.reset());assert.equal(await refresh(),true);await page.evaluate(()=>window.nativeHarness.dispose());assert.equal(await page.locator('iframe').count(),0);}
  checks.push('Late Refresh/revocation, actual native observer disconnect, stale frame destruction, repeated close/dispose and zero host listeners/timers');
  await page.evaluate(()=>window.nativeHarness.reset());assert.equal(await refresh({body:'Restricted native Card'}),true);f=frame();
  observations.effects=await f.evaluate(async()=>{
    const results={};window.violations=[];document.addEventListener('securitypolicyviolation',e=>window.violations.push(e.effectiveDirective));
    try{await fetch('https://denied.invalid/operation',{method:'POST',body:'denied'});}catch(e){results.fetch=e.name;}
    try{localStorage.setItem('denied','1');}catch(e){results.storage=e.name;}
    try{top.location.href='https://denied.invalid';}catch(e){results.top=e.name;}
    results.popup=window.open('https://denied.invalid')===null;
    const link=document.createElement('a');link.href='https://denied.invalid';link.download='denied';document.body.append(link);link.click();
    const input=document.createElement('input');input.type='file';document.body.append(input);input.click();
    const form=document.createElement('form');form.action='https://denied.invalid';document.body.append(form);form.requestSubmit();
    const image=document.createElement('img');image.src='https://denied.invalid/image';document.body.append(image);
    const script=document.createElement('script');script.textContent='window.UNAPPROVED_EXECUTED=true';document.body.append(script);
    const channel=JSON.parse(document.documentElement.dataset.channel);window.postMessage({...channel,type:'render',sample:{}},'*');parent.postMessage({...channel,nonce:'wrong',type:'ready'},'*');parent.postMessage({...channel,type:'Save'},'*');parent.postMessage({...channel,type:'Publish'},'*');
    return results;
  });
  await page.waitForTimeout(50);observations.policy=await f.evaluate(()=>({violations:window.violations,executed:!!window.UNAPPROVED_EXECUTED,cardCount:document.querySelectorAll('uib-card').length}));
  assert.equal(observations.effects.fetch,'TypeError');assert.equal(observations.effects.storage,'SecurityError');assert.equal(observations.effects.top,'SecurityError');assert.equal(observations.effects.popup,true);assert.equal(observations.policy.executed,false);assert.equal(observations.policy.cardCount,1);assert(observations.policy.violations.includes('connect-src'));assert(observations.policy.violations.includes('img-src'));assert(observations.policy.violations.includes('script-src-elem'));assert.equal(context.pages().length,1);
  assert.equal(await page.locator('iframe').getAttribute('sandbox'),'allow-scripts');
  await page.evaluate(()=>window.nativeHarness.deny());assert.equal(await page.locator('iframe').count(),0);assert.equal(await refresh(),false);
  checks.push('Unchanged strict CSP/opaque sandbox; network/storage/navigation/popup/form/file/download/script and forged message effects denied');
  await page.evaluate(()=>window.nativeHarness.regression('card'));f=frame();assert.equal(await f.locator('uib-card').count(),1);const oldPolicy=await f.evaluate(()=>document.querySelector('meta[http-equiv]').content);
  assert.equal(oldPolicy.replace(/sha256-[^']+/g,'sha256-PIN'),observations.nativeIdentity.csp.replace(/sha256-[^']+/g,'sha256-PIN'));
  await page.evaluate(()=>window.nativeHarness.clearRegression());await page.evaluate(()=>window.nativeHarness.regression('panel'));f=frame();assert.equal(await f.locator('uib-panel').count(),1);await page.evaluate(()=>window.nativeHarness.clearRegression());
  checks.push('Unchanged accepted fixture Card/Panel smoke and exact CSP directive equivalence');
  assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(downloads.length,0);assert.equal(choosers.length,0);assert(serverRequests.every(r=>r.method==='GET'&&routes.has(r.url)&&r.cookie===null&&r.authorization===null));assert(navigations.filter(n=>n.main).every(n=>n.url===origin+'/'));
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:true,checks,observations,serverRequests,requests,failures,errors,consoleMessages,downloads,choosers,navigations,limits:'Authored capture/model authority only; fixed native registration distinct from Card construction. Native listeners confined to destroyed frames, not a general native listener-removal API. No production capture/revocation/security qualification.'},null,2));
  console.log('PASS '+checks.length+' native browser checkpoints: '+out);
}catch(e){fs.writeFileSync(path.join(out,'browser-failure.json'),JSON.stringify({error:String(e),stack:e.stack,checks,observations,serverRequests,requests,failures,errors,consoleMessages},null,2));throw e;}
finally{await browser?.close();await new Promise(r=>server.close(r));}
