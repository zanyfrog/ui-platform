import { parseSavedPreviewSelection, savedPreviewSelectionKey, productionSavedPreviewUnavailable } from '../../shared/saved-preview-request.js';
import type { SavedPreviewSelection, SavedPreviewRequest, SavedPreviewUnavailable } from '../../shared/saved-preview-request.js';
export interface SavedPreviewRequestSnapshot {
  state:'idle'|'pending'|'unavailable'|'parked'|'suspended'|'disposed';generation:number;
  reason:string;selection:SavedPreviewSelection|null;request:SavedPreviewRequest|null;outcome:SavedPreviewUnavailable|null;
}
const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
/** Actual production controller; the completion barrier cannot provide an allow/capture result. */
export class SavedPreviewRequestController {
  private value:SavedPreviewRequestSnapshot={state:'idle',generation:0,reason:'Select an artifact to check local readiness.',selection:null,request:null,outcome:null};
  private listeners=new Set<(s:SavedPreviewRequestSnapshot)=>void>();
  private completion:()=>Promise<void>;
  private unresolvedIdentity=false;
  constructor(completion:()=>Promise<void>=()=>Promise.resolve()){this.completion=completion;}
  get snapshot(){return copy(this.value);}
  subscribe(listener:(s:SavedPreviewRequestSnapshot)=>void){if(this.value.state==='disposed')return ()=>{};this.listeners.add(listener);listener(this.snapshot);return ()=>{this.listeners.delete(listener);};}
  private emit(){for(const listener of this.listeners)listener(this.snapshot);}
  private cancel(state:SavedPreviewRequestSnapshot['state'],reason:string,clearSelection=false){
    this.value={...this.value,state,generation:this.value.generation+1,reason,request:null,outcome:null,...(clearSelection?{selection:null}:{})};this.emit();
  }
  select(input?:unknown){
    if(this.value.state==='disposed')return;
    let selected:SavedPreviewSelection|null=null;
    try{if(input!==undefined&&input!==null)selected=parseSavedPreviewSelection(input);}
    catch{this.unresolvedIdentity=true;this.cancel('unavailable','Invalid original identity.',true);this.value.outcome={kind:'unavailable',code:'UNRESOLVED_IDENTITY'};this.emit();return;}
    this.unresolvedIdentity=false;
    const changed=(selected?savedPreviewSelectionKey(selected):null)!==(this.value.selection?savedPreviewSelectionKey(this.value.selection):null);
    if(changed){this.value.selection=selected;this.cancel('idle','Original selection changed; explicit check required.');}
    else {this.value.selection=selected;if(selected&&['parked','suspended'].includes(this.value.state))this.cancel('idle','Selection restored; explicit check required.');else this.emit();}
  }
  async check():Promise<SavedPreviewUnavailable|undefined>{
    if(['disposed','parked','suspended'].includes(this.value.state))return;
    const generation=this.value.generation+1;
    const unresolvedIdentity=this.unresolvedIdentity;
    const request:SavedPreviewRequest={schema:'saved-preview-request-v1',generation,trigger:'explicit-check',selection:this.value.selection?copy(this.value.selection):null};
    this.value={...this.value,state:'pending',generation,reason:'Checking local prerequisites only; no source acquisition.',request,outcome:null};this.emit();
    try{await this.completion();}catch{/* Failure remains unavailable, never a success path. */}
    if(this.value.generation!==generation||this.value.state!=='pending')return;
    const outcome:SavedPreviewUnavailable=unresolvedIdentity?{kind:'unavailable',code:'UNRESOLVED_IDENTITY'}:productionSavedPreviewUnavailable(request);
    this.value={...this.value,state:'unavailable',reason:'Readiness is not authorization or available rendering.',outcome};this.emit();return copy(outcome);
  }
  sourceChanged(reason='Saved source changed; explicit check required.'){if(this.value.state!=='disposed')this.cancel(this.value.state==='parked'?'parked':this.value.state==='suspended'?'suspended':'idle',reason);}
  park(){if(this.value.state!=='disposed')this.cancel('parked','Workspace parked.',true);}
  resume(){if(this.value.state==='parked')this.cancel('idle','Workspace mounted; explicit check required.');}
  suspend(reason='Session or owner changed.'){if(this.value.state!=='disposed')this.cancel('suspended',reason,true);}
  dispose(){if(this.value.state!=='disposed'){this.cancel('disposed','Saved readiness disposed.',true);this.listeners.clear();}}
}
