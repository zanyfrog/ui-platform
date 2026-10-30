import assert from 'node:assert/strict';
export async function verifyEditor(Window, code) {
 const w=new Window({url:'http://fixture.invalid/'}); w.structuredClone=structuredClone; w.crypto=globalThis.crypto;
 w.Option=function(text='',value=text){const o=w.document.createElement('option');o.text=text;o.value=value;return o;};w.HTMLElement.prototype.scrollIntoView=function(){};w.eval(code);w.guided.configureAutosave({enabled:false,delayMs:500});
 const metadata={schemaVersion:1,artifactId:'art_services',kind:'page',name:'services',displayName:'Services',route:'/services',routeId:'route_services',shellId:'art_shell'};
 const files={source:'',css:'',metadata:JSON.stringify(metadata),fixtures:'{}',code:'export {};'};
 const page={locator:'services/page.visual.json',hash:'1'.repeat(64),metadata,files,diagnostics:[]};
 const shell={locator:'shell/page.visual.json',hash:'2'.repeat(64),metadata:{schemaVersion:1,artifactId:'art_shell',kind:'shell',name:'shared',displayName:'Shared'},files:{...files,source:'<main data-uip-node="shell_main" data-uip-region="region-main" data-uip-region-name="Main content">Shared default</main>'},diagnostics:[]};
 const contact={...structuredClone(page),locator:'contact/page.visual.json',metadata:{...metadata,name:'contact',displayName:'Contact',artifactId:'art_contact',routeId:'route_contact',route:'/contact'}};
 let workspace={pages:[page,contact],shells:[shell],components:[],packages:[]}; let saved=structuredClone(page);const calls=[];
 const request=async(url,init)=>{calls.push({url,method:init?.method??'GET'});if(init?.method==='PUT'){const body=JSON.parse(init.body);assert.equal(body.expectedHash,saved.hash);saved={...saved,files:structuredClone(body.files),hash:'3'.repeat(64)};workspace.pages[0]=saved;return structuredClone(saved);}if(url.endsWith('/visual-artifacts'))return structuredClone(workspace);return structuredClone(saved);};
 const host=w.document.createElement('section');w.document.body.append(host);
 const editor=await w.guided.mount(host,'fixture',{workspace,initial:{kind:'page',locator:page.locator},request,captureRequest:()=>request});editor.focus(workspace);
 const tick=()=>new Promise(r=>setTimeout(r,5));
 const button=text=>[...host.querySelectorAll('button')].find(b=>b.textContent===text);
 const source=()=>host.querySelector('[data-source]').value;
 assert.equal(source(),'');assert.ok(host.querySelector('[data-main-content]').textContent.includes('No Page override exists'));
 button('Use shared Shell default main content').click();await tick();assert.equal(source(),'');assert.equal(calls.filter(c=>c.method==='PUT').length,0);
 button('Create Page-specific main content').click();await tick();const regionId=host.querySelector('[data-nodes]').value;assert.match(source(),/data-uip-region="region-main"/);assert.ok(regionId.startsWith('node_'));assert.equal(shell.files.source.includes('Shared default'),true);
 const text=value=>{const input=[...host.querySelectorAll('[data-inspector] label')].find(l=>l.textContent==='Text content')?.querySelector('input');if(!input)throw Error('MISSING_TEXT '+host.querySelector('[data-status]').textContent+' HTML '+source()+' INSPECTOR '+host.querySelector('[data-inspector]').innerHTML);input.value=value;input.dispatchEvent(new w.Event('change'));};
 for(const [label,value] of [['Heading','Services'],['Paragraph','We help you build.'],['Link','Contact us']]){button('Add '+label).click();await tick();text(value);await tick();}
 const destination=host.querySelector('[aria-label="Saved Page destination"]');assert.ok([...destination.options].some(o=>o.value==='/contact'));destination.value='/contact';destination.dispatchEvent(new w.Event('change'));await tick();
 const html=source();assert.ok(html.includes('href="/contact"'));const t=w.document.createElement('template');t.innerHTML=html;const region=t.content.querySelector('[data-uip-region]');assert.equal(region.querySelector('h1').textContent,'Services');assert.equal(region.querySelector('p').textContent,'We help you build.');assert.equal(region.querySelector('a').textContent,'Contact us');assert.equal(t.content.querySelectorAll('h1,p,a').length,region.querySelectorAll('h1,p,a').length);
 const ids=[...t.content.querySelectorAll('[data-uip-node]')].map(n=>n.getAttribute('data-uip-node'));assert.equal(new Set(ids).size,ids.length);
 const href=host.querySelector('[aria-label="Link destination (href)"]');href.value='/missing';href.dispatchEvent(new w.Event('change'));await tick();assert.equal(source(),html);assert.match(host.querySelector('[data-status]').textContent,/missing, ambiguous or unsupported/);
 button('Save Now').click();await tick();assert.equal(saved.files.source,html);button('Reload / discard editor changes').click();await tick();assert.equal(source(),html);assert.equal(saved.metadata.artifactId,'art_services');
 button('Saved Design Preview').click();await tick();assert.equal(host.querySelector('[data-preview-host]').dataset.savedRevision,saved.hash);assert.equal(host.querySelector('iframe').getAttribute('src'),'/visual-preview.html');
 const result={passed:true,scope:'Actual editor in isolated DOM with in-memory saved transport; does not prove normal Chrome or production save authority',inheritanceNoOverride:true,explicitOverrideSelected:regionId,literalHtml:html,managedNodeIds:ids,originalArtifactId:saved.metadata.artifactId,saveReload:true,missingDestinationRefused:true,previewOpenedRevision:saved.hash,calls};
 await editor.dispose();await w.happyDOM.close();return result;
}

