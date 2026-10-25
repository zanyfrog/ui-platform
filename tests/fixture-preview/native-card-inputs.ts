import manifest from '../../../ui-base/packages/ui-base-ui/ui.component.json';
import { CARD_ID, hashText, canonical, seal } from '../../src/client/native-card-preview/admission.js';
import type { Profile } from '../../src/client/native-card-preview/admission.js';
export async function authoredProfile(bundleDigest:string,closureDigest:string):Promise<Profile>{
  const definition=JSON.parse(JSON.stringify(manifest.components.find(c=>c.schemaVersion==='1.0.0'&&c.identity?.componentId===CARD_ID)!));
  return {definition,definitionDigest:await hashText(canonical(definition)),closureDigest,bundleDigest,activation:'authored-active-1',
    binding:{authorityId:'authored-authority',subjectId:'authored-alice',sessionHandle:'authored-session',sessionRevision:'s1',applicationId:'authored-app-permanent',owner:{kind:'package',id:'@ui-base/ui'},selectedIdentity:CARD_ID},
    epoch:{policy:{authorityId:'authored-authority',lineage:'authored-lineage',revision:'1'},sessionRevision:'s1',ownerRevision:'owner-1',scopeDigest:await hashText('authored-visible-scope'),validUntil:10000},limits:{maxText:512,maxInputBytes:8192}};
}
export async function authoredCapture(p:Profile,settings:Record<string,unknown>={}){return seal({schema:'canonical-card-capture-v1',componentId:CARD_ID,packageName:'@ui-base/ui',packageVersion:'0.5.1',schemaVersion:'1.0.0',definitionDigest:p.definitionDigest,closureDigest:p.closureDigest,bundleDigest:p.bundleDigest,activation:p.activation,settings,binding:p.binding,epoch:p.epoch,expires:9000});}
