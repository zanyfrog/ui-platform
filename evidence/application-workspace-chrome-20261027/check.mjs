import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'../..');
const require=createRequire(path.join(root,'packages/artifacts/package.json'));
const ts=require('typescript');
const domRequire=createRequire(path.resolve(root,'../ui-base/package.json'));
const {Window}=domRequire('happy-dom');
const source=fs.readFileSync(path.join(root,'src/client/main.ts'),'utf8');
const parsed=ts.createSourceFile('main.ts',source,ts.ScriptTarget.Latest,true);
const declarations=['shell','renderApp'].map(name=>parsed.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).getText(parsed)).join('\n');
const syntax=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).diagnostics??[];
assert.equal(syntax.length,0,'main.ts syntax');
const compiled=ts.transpileModule(declarations,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const window=new Window({url:'http://fixture.invalid'}),document=window.document;
document.body.innerHTML='<div id="app"></div>';
const rootElement=document.querySelector('#app');
const context={root:rootElement,currentKey:null,currentSearch:'',document,window,URL,Event:window.Event,structuredClone,console,
 parkBuilder(){},bindCommon(){},sidebar:()=>'',esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
 actionButton:(action,label)=>`<button type="button" data-action="${action}">${label}</button>`,appInitial:()=> 'F',appStatusBadge:()=>'<span class="status-pill">active</span>',icon:()=>'',settingControl:()=>'',
 api:async()=>({name:'Fixture application',key:'fixture',appId:'fixture-id',valid:true,status:'active',settings:{description:'Fixture description'},pages:['/']}),
 mountBuilder(){},mountAppPackages(){},mountPresentation(){},settingsSession:async()=>({flush:async()=>true})};
runInNewContext(compiled+';this.checkShell=shell;this.checkApp=renderApp;',context);
context.checkShell('<p>Applications</p>');assert.ok(rootElement.querySelector('.global-search'));assert.ok(rootElement.querySelector('[data-action="new"]'));
await context.checkApp('fixture');
assert.equal(rootElement.querySelector('.global-search'),null);assert.equal(rootElement.querySelector('[data-action="new"]'),null);
const header=rootElement.querySelector('[data-app-header]'),details=rootElement.querySelector('#application-header-details'),toggle=rootElement.querySelector('[data-app-details-toggle]'),tabs=rootElement.querySelector('uib-tabs.app-tabs');
assert.equal(details.hidden,false);assert.equal(toggle.hidden,true);
tabs.dispatchEvent(new window.CustomEvent('uib-tabs-change',{detail:{newValue:1}}));assert.equal(header.classList.contains('is-compact'),true);assert.equal(details.hidden,true);assert.equal(toggle.hidden,false);assert.equal(toggle.getAttribute('aria-expanded'),'false');
toggle.click();assert.equal(details.hidden,false);assert.equal(toggle.textContent,'Hide details');toggle.click();assert.equal(details.hidden,true);
tabs.dispatchEvent(new window.CustomEvent('uib-tabs-change',{detail:{newValue:0}}));assert.equal(header.classList.contains('is-compact'),false);assert.equal(details.hidden,false);assert.equal(toggle.hidden,true);
const actions=rootElement.querySelector('.app-actions');assert.equal(actions.querySelector('summary').textContent,'⋯');
let forwarded=0;rootElement.querySelector('#settingsForm [data-action="export"]').addEventListener('click',event=>{event.stopImmediatePropagation();forwarded++;},{capture:true});
actions.open=true;rootElement.querySelector('[data-app-action="export"]').click();assert.equal(forwarded,1);assert.equal(actions.open,false);
fs.writeFileSync(path.join(import.meta.dirname,'result.json'),JSON.stringify({passed:true,checks:['main.ts syntax','Applications list controls retained','selected application list controls removed','Overview details retained','editing tab compact and accessible toggle','Overview restores details','ellipsis forwards existing action and closes'],scope:'Exact shell/renderApp declarations in isolated DOM; mock data/mounts, no services or normal-session claim',normalBrowser:'not run: admitted localhost:5374 unavailable'},null,2));
await window.happyDOM.close();console.log('PASS application workspace UI checks');
