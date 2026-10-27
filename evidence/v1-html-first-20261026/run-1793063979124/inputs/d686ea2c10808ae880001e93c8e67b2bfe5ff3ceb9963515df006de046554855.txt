import {mountVisualEditor} from '../../src/client/visual-artifacts/editor.js';
import {parseSource} from '../../packages/visual-artifacts/src/source.js';
import {mountVisualArtifact} from '../../packages/visual-artifacts/src/runtime.js';
import {configureAutosave} from '../../src/client/artifact-editor/autosave-configuration.js';
let host:HTMLElement,editor:Awaited<ReturnType<typeof mountVisualEditor>>,workspace:any;
declare global{interface Window{htmlFirst:any;htmlFirstInitial:string;htmlFirstBridge:(url:string,init?:string)=>Promise<string>}}
const plain=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
window.htmlFirst={
 async mount(enabled=false){configureAutosave({enabled,delayMs:500});workspace=JSON.parse(window.htmlFirstInitial);host=document.createElement('section');document.body.append(host);const request=async(url:string,init?:RequestInit)=>JSON.parse(await window.htmlFirstBridge(url,init?JSON.stringify(init):undefined));editor=await mountVisualEditor(host,'fixture-app',{workspace,initial:{kind:'page',locator:workspace.pages[0].locator},applicationId:'4bdc70a0-9bb4-4bf1-9dd4-3abbaf59f220',request:request as any,captureRequest:()=>request as any});editor.focus(workspace);},
 add(id:string){host.querySelector<HTMLSelectElement>('[data-insert]')!.value='package:'+id;host.querySelector<HTMLButtonElement>('[data-add]')!.click();},
 root(){host.querySelector<HTMLButtonElement>('[data-root]')!.click();},
 select(id:string){const select=host.querySelector<HTMLSelectElement>('[data-nodes]')!;select.value=id;select.dispatchEvent(new Event('change'));},
 property(key:string,value:unknown){const input=host.querySelector<HTMLInputElement|HTMLSelectElement>(`[aria-label="Setting ${key}"]`)!;if(!input)throw Error('No property '+key);if(input instanceof HTMLSelectElement)input.value=JSON.stringify(value);else if(input.type==='checkbox')input.checked=Boolean(value);else input.value=String(value);input.dispatchEvent(new Event('change'));},
 source(){return host.querySelector<HTMLTextAreaElement>('[data-source]')!.value;},
 nodes(){return plain(parseSource(this.source()).nodes.filter(n=>n.id).map(n=>({id:n.id,tag:n.tag,attributes:n.attributes})));},
 save(){host.querySelector<HTMLButtonElement>('[data-save]')!.click();},reload(){host.querySelector<HTMLButtonElement>('[data-reload]')!.click();},
 undo(){host.querySelector<HTMLButtonElement>('[data-undo]')!.click();},redo(){host.querySelector<HTMLButtonElement>('[data-redo]')!.click();},
 dirty(){return editor.state();},preview(){host.querySelector<HTMLButtonElement>('[data-preview]')!.click();},
 busy(){return Boolean((host.querySelector('[data-work]') as HTMLElement).inert);},
 draft(source:string){const t=host.querySelector<HTMLTextAreaElement>('[data-source]')!;t.value=source;t.dispatchEvent(new Event('input'));},
 status(){return host.textContent;},async dispose(){await editor.dispose();host.remove();},
 render(bundle:any){const instance=mountVisualArtifact({metadata:bundle.metadata,source:bundle.files.source,css:bundle.files.css},{components:[],packages:workspace.packages,services:{}});document.body.append(instance.host);return{cards:instance.root.querySelectorAll('uib-card').length,panels:instance.root.querySelectorAll('uib-panel').length,text:instance.root.textContent,card:instance.root.querySelector('uib-card')?.outerHTML,destroy:()=>instance.destroy()};},
};
