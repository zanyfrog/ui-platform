// Appended ONLY to the verified disposable wp4-plan test; uses its existing harness.
it('records exact stale-planner predicates without extending freshness or authority',async()=>{
 const fs=await import('node:fs/promises'),path=await import('node:path');
 const physical=process.env.UI_PLATFORM_DATA_PHYSICAL_ROOT,original=process.env.UI_PLATFORM_DATA_ORIGINAL_ROOT;
 if(!physical||!original||await fs.realpath('.')!==await fs.realpath(physical)||await fs.realpath(physical)===await fs.realpath(original))throw Error('PHYSICAL_ISOLATION_REQUIRED');
 const cases:any[]=[];
 for(const kind of ['unchanged','wrong-capability','unissued-copy','mutated-evidence','exact-expiry','policy','principal','session','resource','fact','request','revoked-role','cells','provenance']){
  const h=harness([rule('read','p-read','allow')]),request:AccessRequest=await h.identity.attest({context:h.context,resource:dataset,permissionId:'p-read',operationId:'op',fields:[{fieldId:'field-a',usage:'read'}]});
  let decision=await h.evaluator.planEvidence(request,h.capability),capability=h.capability,currentRequest=request;
  const observed:any[]=[];(globalThis as any)[Symbol.for('stage5.plannerTrace')]=(v:any)=>observed.push(v);
  if(kind==='wrong-capability')capability={};
  if(kind==='unissued-copy')decision=structuredClone(decision);
  if(kind==='mutated-evidence')decision.requestDigest='sha256:changed';
  if(kind==='exact-expiry')h.state.now=new Date(decision.stamp.expiresAt);
  if(kind==='policy')h.state.policyRevision='2';if(kind==='principal')h.state.principalRevision='p2';if(kind==='session')h.state.sessionRevision='s2';if(kind==='resource')h.state.resourceRevision='r2';if(kind==='fact')h.state.factRevision='f2';
  if(kind==='request')currentRequest=await h.identity.attest({...request,operationId:'different'});
  if(kind==='revoked-role'){const a=h.records.find(r=>r.kind==='role-assignment');if(a?.kind!=='role-assignment')throw Error('FIXTURE_MISSING');a.status='inactive';}
  if(kind==='cells'||kind==='provenance'){const s=h.records.find(r=>r.kind==='permission-set');if(s?.kind!=='permission-set')throw Error('FIXTURE_MISSING');s.rules.push(rule('extra',kind==='cells'?'p-read':'p-filter','allow'));}
  let rejected=false;try{await h.evaluator.assertPlannerCurrent(decision,currentRequest,capability);}catch(e){expect((e as Error).message).toBe('PLAN_EVIDENCE_STALE');rejected=true;}finally{delete(globalThis as any)[Symbol.for('stage5.plannerTrace')];}
  expect(rejected,kind).toBe(kind!=='unchanged');const failed=observed.find(e=>e.phase.endsWith('-reject')),first=failed?.checks.find((c:any)=>c.failed)?.name;
  const expected:Record<string,string>={'wrong-capability':'capability.same','unissued-copy':'issued.checksum','mutated-evidence':'issued.checksum','exact-expiry':'issued.expiry',policy:'current.policyRevision',principal:'current.principalRevision',session:'current.sessionRevision',resource:'current.resourceRevision',fact:'current.factRevision',request:'current.requestDigest','revoked-role':'current.effect',cells:'current.evaluatedCells',provenance:'current.provenance'};
  expect(first,kind).toBe(expected[kind]);cases.push({kind,rejected,firstPredicate:first??null,observed});
 }
 await fs.mkdir('diagnostics',{recursive:true});await fs.writeFile(path.resolve('diagnostics/planner-negative-cases.json'),JSON.stringify({cases,scope:'Controlled in-memory harness mutations, not real policy writes; no original source or budgets changed'},null,2));
});
