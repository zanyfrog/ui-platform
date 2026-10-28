import {mountVisualEditor} from '../../src/client/visual-artifacts/editor.js';
import {parseSource} from '../../packages/visual-artifacts/src/source.js';
import {mountVisualArtifact} from '../../packages/visual-artifacts/src/runtime.js';
import {configureAutosave} from '../../src/client/artifact-editor/autosave-configuration.js';
let host:HTMLElement,editor:Awaited<ReturnType<typeof mountVisualEditor>>,workspace:any;
declare global{interface Window{htmlFirst:any;htmlFirstInitial:string;htmlFirstBridge:(url:string,init?:string)=>Promise<string>}}
const plain=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
window.htmlFirst={
 authoringChecks(){
  const original=this.source();this.draft('<section class="uip-layout-item" data-uip-node="node_intro"><h2 data-uip-node="node_heading">Introduction &amp; welcome</h2><a data-uip-node="node_link" href="/old">Read more</a><img data-uip-node="node_image" src="assets/logo.svg" alt="Old"></section>');
  const options=[...host.querySelectorAll<HTMLOptionElement>('[data-nodes] option')];
  if(!options.find(o=>o.value==='node_intro')?.textContent?.includes('section — Introduction & welcome'))throw Error('Missing derived section summary');
  if(!options.find(o=>o.value==='node_heading')?.textContent?.startsWith('\u00a0\u00a0h2'))throw Error('Missing containment indentation');
  if(options.find(o=>o.value==='node_intro')?.title!=='node_intro')throw Error('Diagnostic ID lost');
  const edit=(label:string,value:string)=>{const input=host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;if(!input)throw Error('Missing '+label);input.value=value;input.dispatchEvent(new Event('change'));};
  this.select('node_link');let before=this.source();edit('Link destination (href)','javascript:alert(1)');if(this.source()!==before)throw Error('Inspector admitted unsafe href');edit('Link destination (href)','#feature');if(!this.source().includes('href="#feature"'))throw Error('Safe href missing');
  this.select('node_image');before=this.source();edit('Image source (src)','data:image/png;base64,no');if(this.source()!==before)throw Error('Inspector admitted unsafe src');edit('Image source (src)','assets/existing.png');edit('Alternative text (alt)','A "quote" & <text>');
  const image=this.nodes().find((n:any)=>n.id==='node_image');if(image.attributes.alt!=='A "quote" & <text>'||image.attributes.src!=='assets/existing.png')throw Error('Literal image edit failed');
  this.draft(original);this.root();
 },
 async mount(enabled=false){configureAutosave({enabled,delayMs:500});workspace=JSON.parse(window.htmlFirstInitial);host=document.createElement('section');document.body.append(host);const request=async(url:string,init?:RequestInit)=>JSON.parse(await window.htmlFirstBridge(url,init?JSON.stringify(init):undefined));editor=await mountVisualEditor(host,'fixture-app',{workspace,initial:{kind:'page',locator:workspace.pages[0].locator},applicationId:'4bdc70a0-9bb4-4bf1-9dd4-3abbaf59f220',request:request as any,captureRequest:()=>request as any});editor.focus(workspace);},
 add(id:string){host.querySelector<HTMLSelectElement>('[data-insert]')!.value='package:'+id;host.querySelector<HTMLButtonElement>('[data-add]')!.click();},
 root(){host.querySelector<HTMLButtonElement>('[data-root]')!.click();},
 select(id:string){const select=host.querySelector<HTMLSelectElement>('[data-nodes]')!;select.value=id;select.dispatchEvent(new Event('change'));},
 layout(key:string,value:string){const input=host.querySelector<HTMLInputElement>(`[aria-label="Layout base ${key}"]`)!;if(!input)throw Error('No layout '+key);input.value=value;input.dispatchEvent(new Event('change'));},
 responsive(bp:string,key:string,value:string){const breakpoint=host.querySelector<HTMLSelectElement>('[data-breakpoint]')!;breakpoint.value=bp;breakpoint.dispatchEvent(new Event('change'));const input=host.querySelector<HTMLInputElement>(`[aria-label="Layout ${bp} ${key}"]`)!;if(!input)throw Error('No responsive layout '+bp+' '+key);input.value=value;input.dispatchEvent(new Event('change'));},
 property(key:string,value:unknown){const input=host.querySelector<HTMLInputElement|HTMLSelectElement>(`[aria-label="Setting ${key}"]`)!;if(!input)throw Error('No property '+key);if(input instanceof HTMLSelectElement)input.value=JSON.stringify(value);else if(input.type==='checkbox')input.checked=Boolean(value);else input.value=String(value);input.dispatchEvent(new Event('change'));},
 source(){return host.querySelector<HTMLTextAreaElement>('[data-source]')!.value;},
 nodes(){return plain(parseSource(this.source()).nodes.filter(n=>n.id).map(n=>({id:n.id,tag:n.tag,attributes:n.attributes})));},
 save(){host.querySelector<HTMLButtonElement>('[data-save]')!.click();},reload(){host.querySelector<HTMLButtonElement>('[data-reload]')!.click();},
 undo(){host.querySelector<HTMLButtonElement>('[data-undo]')!.click();},redo(){host.querySelector<HTMLButtonElement>('[data-redo]')!.click();},
 dirty(){return editor.state();},preview(){host.querySelector<HTMLButtonElement>('[data-preview]')!.click();},
 previewState(){const p=host.querySelector<HTMLElement>('[data-preview-host]')!;return{feedback:p.querySelector('[role="status"]')?.textContent,heading:p.querySelector('h3')?.textContent,focusable:p.tabIndex===-1,beforeDiagnostics:p.nextElementSibling?.hasAttribute('data-diagnostics'),scrolled:p.dataset.testScrolled==='true',frames:p.querySelectorAll('iframe').length};},
 busy(){return Boolean((host.querySelector('[data-work]') as HTMLElement).inert);},
 draft(source:string){const t=host.querySelector<HTMLTextAreaElement>('[data-source]')!;t.value=source;t.dispatchEvent(new Event('input'));},
 status(){return host.textContent;},async dispose(){await editor.dispose();host.remove();},
 render(bundle:any){const instance=mountVisualArtifact({metadata:bundle.metadata,source:bundle.files.source,css:bundle.files.css},{components:[],packages:workspace.packages,services:{}});document.body.append(instance.host);return{cards:instance.root.querySelectorAll('uib-card').length,panels:instance.root.querySelectorAll('uib-panel').length,text:instance.root.textContent,card:instance.root.querySelector('uib-card')?.outerHTML,destroy:()=>instance.destroy()};},
};
