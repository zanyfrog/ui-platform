import { admit, canonical, clone, hashText } from './admission.js';
import type { Profile, Authority } from './admission.js';
import { validMessage } from './message.js';
import type { Channel } from './message.js';
const attribute=(s:string)=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
export async function restrictedDocument(bootstrap:string,channel:Channel,origin:string,context:unknown) {
  const script=bootstrap.replace(/<\/script/gi,'<\\/script');const hex=(await hashText(script)).slice(7);
  const base64=btoa(String.fromCharCode(...hex.match(/../g)!.map(n=>parseInt(n,16))));
  const csp=`default-src 'none'; script-src 'sha256-${base64}'; script-src-attr 'none'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; font-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'`;
  return `<!doctype html><html data-channel="${attribute(JSON.stringify(channel))}" data-parent-origin="${attribute(origin)}" data-context="${attribute(JSON.stringify(context))}"><head><meta http-equiv="Content-Security-Policy" content="${attribute(csp)}"><meta name="referrer" content="no-referrer"><title>Authored canonical Card</title></head><body><script>${script}</script></body></html>`;
}
export class NativeCardHost {
  readonly element=document.createElement('section');
  private slot=document.createElement('div');private status=document.createElement('p');private summary=document.createElement('p');
  private bootstrap:string;private profile:Profile;private frame?:HTMLIFrameElement;private cancel?:()=>void;
  private sequence=0;private disposed=false;private revoked=false;private last='';
  private listeners=0;private timers=0;
  constructor(bootstrap:string,profile:Profile){this.bootstrap=bootstrap;this.profile=clone(profile);this.element.setAttribute('aria-label','Canonical Card compatibility');this.status.setAttribute('role','status');this.element.append(this.status,this.summary,this.slot);}
  private clear(){this.cancel?.();this.cancel=undefined;this.frame?.remove();this.frame=undefined;this.slot.replaceChildren();}
  async refresh(input:unknown,authority:Authority,now:number) {
    const sequence=++this.sequence;this.clear();this.summary.textContent=this.last?'STALE · '+this.last:'';
    if(this.disposed||this.revoked){this.status.textContent='Unavailable';return false;}
    this.status.textContent='Checking authored input';
    try {
      const captured=await admit(input,this.profile,now,authority);
      if(this.sequence!==sequence||this.disposed||this.revoked)return false;
      if(await hashText(this.bootstrap)!==this.profile.bundleDigest)throw Error('BUNDLE_CHANGED');
      const channel:Channel={nonce:crypto.randomUUID(),session:crypto.randomUUID(),identity:canonical(captured.binding),sequence};
      const {definition,...profileContext}=this.profile;const context={...profileContext,now};
      const source=await restrictedDocument(this.bootstrap,channel,location.origin,context);
      if(this.sequence!==sequence||this.disposed||this.revoked)return false;
      const frame=document.createElement('iframe');this.frame=frame;frame.title='Restricted canonical Card';frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('credentialless','');frame.referrerPolicy='no-referrer';frame.style.cssText='width:100%;height:320px;border:1px solid #aaa';
      const ready=await new Promise<boolean>(resolve=>{
        let finished=false;
        const finish=(ok:boolean,reason?:string)=>{if(finished)return;finished=true;clearTimeout(timer);this.timers--;window.removeEventListener('message',receive);this.listeners--;frame.onload=null;this.cancel=undefined;if(!ok){frame.remove();if(this.frame===frame)this.frame=undefined;if(reason)this.status.textContent=reason;}resolve(ok);};
        const receive=(e:MessageEvent)=>{if(this.frame!==frame||e.source!==frame.contentWindow||e.origin!=='null'||!validMessage(e.data,channel)||e.data.type==='render')return;finish(e.data.type==='ready',e.data.reason);};
        const timer=setTimeout(()=>finish(false,'BOOTSTRAP_TIMEOUT'),5000);this.timers++;window.addEventListener('message',receive);this.listeners++;this.cancel=()=>finish(false);
        frame.onload=()=>frame.contentWindow?.postMessage({...channel,type:'render',sample:captured},'*');frame.srcdoc=source;this.slot.replaceChildren(frame);
      });
      if(!ready||this.sequence!==sequence||this.disposed||this.revoked)return false;
      this.last=String(captured.settings.body??this.profile.definition.builder.settings.body.default);this.summary.textContent='';this.status.textContent='Ready · AUTHORED INPUT · no saved-artifact acquisition';return true;
    }catch(error){if(this.sequence===sequence&&!this.disposed&&!this.revoked)this.status.textContent=String((error as Error).message);return false;}
  }
  stale(){this.sequence++;this.clear();this.summary.textContent=this.last?'STALE · '+this.last:'';this.status.textContent='Stale · native instance removed';}
  invalidate(){this.sequence++;this.revoked=true;this.clear();this.last='';this.summary.textContent='';this.status.textContent='Invalidated · authored simulation';}
  dispose(){this.sequence++;this.disposed=true;this.clear();this.last='';this.summary.textContent='';this.element.remove();}
  metrics(){return {listeners:this.listeners,timers:this.timers,frames:this.slot.querySelectorAll('iframe').length,disposed:this.disposed,revoked:this.revoked,status:this.status.textContent};}
}
