// Diagnostic-only transformation of the verified PHYSICAL Data copy before compilation.
// Every original predicate retains its order, short-circuit and clock-sample count.
const evaluatorFile=path.join(dataRoot,'packages/i-am/src/wp2/evaluator.ts'),evaluatorBefore=await fs.readFile(evaluatorFile,'utf8');
const start=evaluatorBefore.indexOf('  async assertPlannerCurrent('),end=evaluatorBefore.indexOf('\n  }',start)+4;
if(start<0||end<4)throw Error('PLANNER_METHOD_NOT_FOUND');
const method=`  async assertPlannerCurrent(decision: AuthorizationDecision, request: AccessRequest, capability: object): Promise<void> {
    const checks: Record<string,unknown>[]=[];
    const safeStamp=(stamp:AuthorizationDecision['stamp'])=>({...stamp,sessionRevision:canonicalChecksum(stamp.sessionRevision)});
    const emit=(phase:string,current?:AuthorizationDecision)=>{const trace=(globalThis as any)[Symbol.for('stage5.plannerTrace')];trace?.({phase,decisionId:decision.decisionId,checks,issuedStamp:safeStamp(decision.stamp),...(current?{currentStamp:safeStamp(current.stamp),issuedEffect:decision.effect,currentEffect:current.effect,issuedReason:decision.reasonCode,currentReason:current.reasonCode,issuedConditional:decision.conditional,currentConditional:current.conditional}:{})});};
    const check=(name:string,actual:unknown,expected:unknown)=>{const failed=actual!==expected;checks.push({name,actual,expected,failed});return failed;};
    const expired=()=>{const nowMs=this.clock().getTime(),expiresMs=Date.parse(decision.stamp.expiresAt);const failed=nowMs>=expiresMs;checks.push({name:'issued.expiry',nowMs,expiresMs,ageMs:nowMs-Date.parse(decision.stamp.evaluatedAt),failed});return failed;};
    if (check('capability.configured',!!this.dep.plannerCapability,true) || check('capability.same',capability===this.dep.plannerCapability,true) ||
      check('issued.checksum',this.issued.get(decision),canonicalChecksum(decision)) || expired()) {emit('initial-reject');throw new Error('PLAN_EVIDENCE_STALE');}
    const current=await this.planEvidence(request,capability);
    if(check('current.requestDigest',current.requestDigest,decision.requestDigest)||check('current.effect',current.effect,decision.effect)||check('current.conditional',current.conditional,decision.conditional)||
      check('current.policyRevision',current.stamp.policyRevision,decision.stamp.policyRevision)||check('current.principalRevision',current.stamp.principalRevision,decision.stamp.principalRevision)||
      check('current.sessionRevision',canonicalChecksum(current.stamp.sessionRevision),canonicalChecksum(decision.stamp.sessionRevision))||check('current.resourceRevision',current.stamp.resourceRevision,decision.stamp.resourceRevision)||
      check('current.factRevision',current.stamp.factRevision,decision.stamp.factRevision)||check('current.evaluatedCells',canonicalChecksum(current.evaluatedCells),canonicalChecksum(decision.evaluatedCells))||
      check('current.provenance',canonicalChecksum(current.provenance),canonicalChecksum(decision.provenance))) {emit('current-reject',current);throw new Error('PLAN_EVIDENCE_STALE');}
    // Only compact aggregate success evidence; full comparison evidence is emitted on rejection.
    const trace=(globalThis as any)[Symbol.for('stage5.plannerTrace')];trace?.({phase:'allow',decisionId:decision.decisionId,checked:checks.length});
  }`;
const evaluatorAfter=evaluatorBefore.slice(0,start)+method+evaluatorBefore.slice(end);await fs.writeFile(evaluatorFile,evaluatorAfter);
await fs.writeFile(path.join(evidence,'planner-diagnostic-provenance.json'),JSON.stringify({file:evaluatorFile,beforeSha256:createHash('sha256').update(evaluatorBefore).digest('hex'),afterSha256:createHash('sha256').update(evaluatorAfter).digest('hex'),scope:'Disposable Data source only; no original source or contract change; unchanged original predicate order and single expiry sample'},null,2));
