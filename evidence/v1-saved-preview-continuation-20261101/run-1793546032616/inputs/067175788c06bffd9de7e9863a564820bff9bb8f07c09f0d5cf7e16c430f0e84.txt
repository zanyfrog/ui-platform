import {mountVisualEditor} from '../../src/client/visual-artifacts/editor.js';
import {parseSource} from '../../packages/visual-artifacts/src/source.js';
import {mountVisualArtifact} from '../../packages/visual-artifacts/src/runtime.js';
import {configureAutosave} from '../../src/client/artifact-editor/autosave-configuration.js';
let host:HTMLElement,editor:Awaited<ReturnType<typeof mountVisualEditor>>,workspace:any;
declare global{interface Window{htmlFirst:any;htmlFirstInitial:string;htmlFirstBridge:(url:string,init?:string)=>Promise<string>}}
const plain=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
window.htmlFirst={
 addHtml(tag:string){host.querySelector<HTMLSelectElement>('[data-insert]')!.value='html:'+tag;host.querySelector<HTMLButtonElement>('[data-add]')!.click();},
 text(value:string){const input=[...host.querySelectorAll('label')].find(l=>l.firstChild?.textContent==='Text content')?.querySelector('input')!;if(!input)throw Error('Text control missing');input.value=value;input.dispatchEvent(new Event('change'));},
 level(value:string){const select=host.querySelector<HTMLSelectElement>('[aria-label="Heading level"]')!;select.value=value;select.dispatchEvent(new Event('change'));},
 selected(){return host.querySelector<HTMLSelectElement>('[data-nodes]')!.value;},
 labels(){return [...host.querySelectorAll<HTMLOptionElement>('[data-nodes] option')].map(o=>({id:o.value,text:o.textContent}));},
 headingChoices(){return [...host.querySelectorAll<HTMLOptionElement>('[data-insert] option')].filter(o=>/^html:h[1-6]$/.test(o.value)).map(o=>({value:o.value,text:o.textContent}));},
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
