import { NativeCardHost, restrictedDocument } from '../../src/client/native-card-preview/host.js';
import { authoredProfile, authoredCapture } from './native-card-inputs.js';
import { hashText, canonical, clone } from '../../src/client/native-card-preview/admission.js';
import { FixtureHost } from '../../src/client/fixture-preview/host.js';
import { defaultSample, defaultPanelSample } from '../../src/client/fixture-preview/samples.js';
declare const NATIVE_BOOTSTRAP:string;
declare const PINNED_CLOSURE:string;
const profile=await authoredProfile(await hashText(NATIVE_BOOTSTRAP),PINNED_CLOSURE);
const banner=document.createElement('p');banner.textContent='AUTHORED IMMUTABLE CARD COMPATIBILITY · synthetic authority · no saved acquisition';document.body.append(banner);
let host=new NativeCardHost(NATIVE_BOOTSTRAP,profile);document.body.append(host.element);
const regression=document.createElement('section');regression.setAttribute('aria-label','Unchanged fixture smoke');document.body.append(regression);const previous=new FixtureHost(regression);
let allowed=true;
const authority=()=>({allowed,binding:clone(profile.binding),epoch:clone(profile.epoch)});
const api={
  profile,host:()=>host,
  capture:(settings:Record<string,unknown>={})=>authoredCapture(profile,settings),
  refresh:async(settings:Record<string,unknown>={})=>host.refresh(await authoredCapture(profile,settings),authority(),100),
  input:async(input:unknown,now=100)=>host.refresh(input,authority(),now),
  stale:()=>host.stale(),invalidate:()=>host.invalidate(),dispose:()=>host.dispose(),metrics:()=>host.metrics(),
  deny:()=>{allowed=false;host.invalidate();},
  reset:()=>{host.dispose();allowed=true;host=new NativeCardHost(NATIVE_BOOTSTRAP,profile);document.body.insertBefore(host.element,regression);},
  race:async()=>{const promise=host.refresh(await authoredCapture(profile,{body:'late'}),authority(),100);host.invalidate();return promise;},
  regression:async(kind:'card'|'panel')=>{await previous.render({subjectId:'authored-subject',sessionId:'authored-session',applicationId:'authored-app',artifactKey:'authored-artifact'},1,kind==='card'?defaultSample():defaultPanelSample());},
  clearRegression:()=>previous.clear(),
  // Explicit test-only corrupt transit path: no parent admission bypass exists in NativeCardHost.
  rawInvalid:async()=>{
    const capture=await authoredCapture(profile,{body:'raw invalid'});capture.settings.href='https://denied.invalid';
    const channel={nonce:crypto.randomUUID(),session:crypto.randomUUID(),identity:canonical(profile.binding),sequence:1};
    const {definition,...context}=profile;
    const frame=document.createElement('iframe');frame.title='Raw invalid transit';frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('credentialless','');
    const doc=await restrictedDocument(NATIVE_BOOTSTRAP,channel,location.origin,{...context,now:100});
    const done=new Promise<string>(resolve=>{
      const receive=(event:MessageEvent)=>{if(event.source!==frame.contentWindow||event.origin!=='null'||event.data?.nonce!==channel.nonce)return;window.removeEventListener('message',receive);resolve(event.data.reason??event.data.type);};
      window.addEventListener('message',receive);frame.onload=()=>frame.contentWindow!.postMessage({...channel,type:'render',sample:capture},'*');
    });frame.srcdoc=doc;document.body.append(frame);const reason=await done;return reason;
  },
};
(window as any).nativeHarness=api;
