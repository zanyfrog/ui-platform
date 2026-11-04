import manifest from '../../../../ui-base/packages/ui-base-ui/ui.component.json';
import { renderComponentInstance } from '../../../../ui-base/packages/ui-base-ui/src/platform/renderer.js';
import { ComponentRegistry } from '../../../../ui-base/packages/ui-base-ui/src/platform/registry.js';
import { admit, CARD_ID } from './admission.js';
import type { Profile } from './admission.js';
import { validMessage } from './message.js';
import type { Channel } from './message.js';
declare const PINNED_CLOSURE:string;
declare const PINNED_DEFINITION:string;
const channel:Channel=JSON.parse(document.documentElement.dataset.channel!);
const origin=document.documentElement.dataset.parentOrigin!;
const context=JSON.parse(document.documentElement.dataset.context!);
const definition=manifest.components.find(c=>c.schemaVersion==='1.0.0'&&c.identity?.componentId===CARD_ID)!;
const profile:Profile={...context,definition,definitionDigest:PINNED_DEFINITION,closureDigest:PINNED_CLOSURE};
let used=false;
document.addEventListener('submit',e=>e.preventDefault(),true);
document.addEventListener('click',e=>{if(e.composedPath().some(n=>n instanceof Element&&n.matches('a,input[type=file],[download]')))e.preventDefault();},true);
document.addEventListener('dragover',e=>e.preventDefault(),true);document.addEventListener('drop',e=>e.preventDefault(),true);
window.addEventListener('message',async event=>{
  if(event.source!==parent||event.origin!==origin||!validMessage(event.data,channel)||event.data.type!=='render'||used)return;
  used=true;
  try {
    // All captured settings/identities are rejected before native Card construction.
    const capture=await admit(event.data.sample,profile,context.now,{allowed:true,binding:profile.binding,epoch:profile.epoch});
    const registry=new ComponentRegistry();registry.registerManifest({components:[definition]},{packageId:'@ui-base/ui',scope:'platform'});
    const native=renderComponentInstance(definition,{componentId:CARD_ID,settings:capture.settings},{registry,preview:true,onEvent:()=>{}});
    document.body.replaceChildren(native);parent.postMessage({...channel,type:'ready'},origin);
  }catch(error){document.body.replaceChildren();parent.postMessage({...channel,type:'unavailable',reason:String((error as Error).message).slice(0,256)},origin);}
});
