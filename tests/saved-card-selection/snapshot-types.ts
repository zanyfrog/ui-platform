import type { SavedCardTargetSnapshot } from '../../src/client/visual-artifacts/saved-card-target.js';
declare const snapshot:SavedCardTargetSnapshot;
if(snapshot.state==='identified'){
  // @ts-expect-error Snapshot identity is deeply readonly.
  snapshot.target.source.page.owner.id='other';
  // @ts-expect-error Generation is immutable.
  snapshot.generation.source=9;
}
// @ts-expect-error Consumers cannot manufacture the source-owner's opaque identified result.
const forged:SavedCardTargetSnapshot={state:'identified',reason:'RETAINED_SAVED_VERSION_ONLY',generation:{selection:0,source:0},target:{source:{applicationId:'app',page:{owner:{kind:'application',id:'app'},format:'visual',id:'art_page'},committedHash:'hash',nodeId:'node'},implementation:{componentId:'id',packageId:'pkg',packageVersion:'v',importPath:'pkg',exportName:'Card',definitionRevision:null},context:{subjectId:'subject',sessionRevision:'session'}}};
void forged;
