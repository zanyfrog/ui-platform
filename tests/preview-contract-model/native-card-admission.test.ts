import test from 'node:test';
import assert from 'node:assert/strict';
import { admit, canonical, hashText, seal, CardDenied } from '../../src/client/native-card-preview/admission.js';
import { authoredCapture, authoredProfile } from '../fixture-preview/native-card-inputs.js';
import { validMessage } from '../../src/client/native-card-preview/message.js';
declare const PINNED_CLOSURE:string;
async function fixture(){const p=await authoredProfile(await hashText('authored fixed unit bundle'),PINNED_CLOSURE);return {p,c:await authoredCapture(p),a:{allowed:true,binding:p.binding,epoch:p.epoch}};}
const denied=async(fn:()=>Promise<unknown>,code:string)=>assert.rejects(fn,e=>e instanceof CardDenied&&e.code===code);
test('real Definition identity/schema and native defaults admitted without loading renderer or constructing DOM',async()=>{
  const {p,c,a}=await fixture();const result=await admit(c,p,100,a);assert.equal(p.definition.identity.name,'card');assert.equal(p.definition.schemaVersion,'1.0.0');assert.equal(p.definition.builder.settings.body.default,'Card body');assert.deepEqual(result,c);
});
test('canonical byte vector and caller-copy independence',async()=>{
  assert.equal(canonical({b:2,a:1}),'{"a":1,"b":2}');assert.equal(await hashText('a'),'sha256:ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb');
  const {p,c,a}=await fixture(),result=await admit(c,p,100,a);result.binding.subjectId='changed';assert.equal(c.binding.subjectId,'authored-alice');
});
for(const key of ['mediaSrc','href','target','rel','action','actionToken','actionHandler','selectionHandler','cssClass','serviceRefs','children','style','properties','unknown'])test('reject setting capability '+key,async()=>{
  const {p,a}=await fixture(),c=await authoredCapture(p,{[key]:'unsafe'});await denied(()=>admit(c,p,100,a),'CAPABILITY_DENIED');
});
for(const mode of ['link','action'])test('reject mode '+mode+' without substitution',async()=>{const {p,a}=await fixture();await denied(async()=>admit(await authoredCapture(p,{interactionMode:mode}),p,100,a),'MODE_DENIED');});
for(const [key,value]of [['variant','unknown'],['density','dense'],['selected',true],['disabled','false'],['body',{}],['interactionMode',false]] as const)test('reject conflicting or invalid setting '+key,async()=>{
  const {p,a}=await fixture();await denied(async()=>admit(await authoredCapture(p,{[key]:value}),p,100,a),'SETTINGS_INVALID');
});
for(const variant of ['elevated','outlined','flat'])for(const density of ['comfortable','compact'])test('native finite settings '+variant+'/'+density,async()=>{
  const {p,a}=await fixture(),c=await authoredCapture(p,{variant,density,interactionMode:'selectable',selected:true,disabled:false,body:'Authored body',header:'Header',footer:'Footer',heading:'Heading',label:'Label',ariaLabel:'Accessible Card',ariaDescribedBy:'local-description',name:'authored'});assert.deepEqual(await admit(c,p,100,a),c);
});
for(const [key,value,code]of [
  ['componentId','foreign','IDENTITY_UNSUPPORTED'],['packageName','foreign','IDENTITY_UNSUPPORTED'],['packageVersion','0.5.2','IDENTITY_UNSUPPORTED'],['schemaVersion','2','IDENTITY_UNSUPPORTED'],
  ['definitionDigest','sha256:'+'0'.repeat(64),'DEFINITION_CHANGED'],['closureDigest','sha256:'+'0'.repeat(64),'EXECUTABLE_CHANGED'],['bundleDigest','sha256:'+'0'.repeat(64),'EXECUTABLE_CHANGED'],['activation','other','ACTIVATION_CHANGED'],['contentDigest','sha256:'+'0'.repeat(64),'CONTENT_CHANGED'],['expires',100,'EXPIRED']
] as const)test('reject inconsistent capture '+key,async()=>{const {p,c,a}=await fixture();Object.assign(c,{[key]:value});await denied(()=>admit(c,p,100,a),code);});
test('Definition bytes changed even under same version refused',async()=>{const {p,c,a}=await fixture();p.definition.identity.description='changed';await denied(()=>admit(c,p,100,a),'DEFINITION_CHANGED');});
test('foreign subject, changed epoch, denied answer and expired rights refused',async()=>{
  for(const type of ['subject','epoch','denied']){const {p,c,a}=await fixture();if(type==='subject')c.binding.subjectId='other';if(type==='epoch')c.epoch.policy.revision='2';if(type==='denied')a.allowed=false;await denied(()=>admit(c,p,100,a),'AUTHORITY_CHANGED');}
  const {p,c,a}=await fixture();await denied(()=>admit(c,p,10000,a),'EXPIRED');
});
test('top-level children and service authority cannot be smuggled as unknown properties',async()=>{const {p,c,a}=await fixture();Object.assign(c,{children:[]});await denied(()=>admit(c,p,100,a),'FIELDS_INVALID');});
test('text, serialized input and required limit boundaries are explicit authored values',async()=>{
  const {p,a}=await fixture();await denied(async()=>admit(await authoredCapture(p,{body:'x'.repeat(513)}),p,100,a),'TEXT_INVALID');await denied(async()=>admit(await authoredCapture(p,{body:'<script>'}),p,100,a),'TEXT_INVALID');
  const c=await authoredCapture(p);p.limits.maxInputBytes=1;await denied(()=>admit(c,p,100,a),'INPUT_LIMIT');p.limits.maxText=0;await denied(()=>admit(c,p,100,a),'LIMIT_INVALID');
});
test('accessor input rejected before getter invocation',async()=>{const {p,a}=await fixture();let ran=false;const c={get settings(){ran=true;return {};}};await denied(()=>admit(c,p,100,a),'DATA_INVALID');assert.equal(ran,false);});
test('exact frame channel rejects forged commands, nonce, identity and sequence',()=>{
  const c={nonce:'nonce',session:'session',identity:'identity',sequence:1};assert(validMessage({...c,type:'ready'},c));
  for(const message of [{...c,type:'Save'},{...c,type:'Publish'},{...c,type:'ready',extra:true},{...c,type:'ready',nonce:'other'},{...c,type:'ready',sequence:2},{...c,type:'ready',identity:'other'}])assert.equal(validMessage(message,c),false);
});
