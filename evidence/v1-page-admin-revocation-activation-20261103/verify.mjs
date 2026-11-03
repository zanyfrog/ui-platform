import fs from'node:fs';import{createHash}from'node:crypto';import{DatabaseSync}from'node:sqlite';import{securityChecksum}from'@ui-platform/i-am/definitions';import{pilot,pilotGrantChanges}from'../../src/shared/pilot-administration.ts';
const mode=process.argv[2],here=new URL('./',import.meta.url),read=n=>JSON.parse(fs.readFileSync(new URL(n,here),'utf8')),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const id='a0f32d75-045e-4b7f-919f-59a99fd9cfe8',checksum='sha256:25ab79548f648465d31dca922bd7f3d9655dbee48c26c245f802f8591538d684';
const db=new DatabaseSync('C:/Projects/Modular/builder-demo/runtime/iam-v1-development.sqlite',{readOnly:true});
const row=db.prepare('SELECT * FROM security_candidates WHERE id=?').get(id),request=JSON.parse(row.request_json),diagnostics=JSON.parse(row.diagnostics_json),result=row.result_json?JSON.parse(row.result_json):null;
const approved=JSON.parse(fs.readFileSync('evidence/v1-guarded-administration-cleanup-20261103/revocation-stored-candidate.json','utf8'));
if(row.checksum!==checksum||row.base_revision!==10||diagnostics.length||JSON.stringify(request.changes)!==JSON.stringify(approved.changes)||request.reason!==approved.reason||request.actorId!==pilot.securityAdmin)throw Error('Candidate mismatch; stop');
const revision=db.prepare('SELECT revision FROM security_state').get().revision,docs=db.prepare('SELECT id,json FROM security_documents ORDER BY id').all();
const expected=pilotGrantChanges(mode==='before'),active=expected.map(c=>JSON.parse(docs.find(d=>d.id===c.document.definition.id).json));
if(JSON.stringify(active)!==JSON.stringify(expected.map(c=>c.document)))throw Error('Unexpected active plan; stop');
if(mode==='before'){
 if(revision!==10||result!==null||!request.changes.every((c,i)=>c.expectedChecksum===securityChecksum(active[i])))throw Error('Stale revision/checksum/result; stop');
}else if(revision!==11||result?.status!=='activated'||result.revision!==11)throw Error('Revocation not confirmed; stop');
const admin=db.prepare('SELECT id,revision,kind,operation,actor_id,target_ids_json,application_id,authority_path_json,reason,before_digest,after_digest,occurred_at,candidate_id FROM security_admin_audit WHERE candidate_id=?').all(id);
const policy=db.prepare('SELECT id,revision,actor_id,source,reason,occurred_at,candidate_id FROM security_audit WHERE candidate_id=?').all(id);
const value={policyRevision:revision,candidate:{id,checksum,baseRevision:10,diagnostics,result,requestSha256:hash(request)},activeDocuments:active,unrelatedDocumentsAndAnchorDigest:hash(docs.filter(d=>d.id!==expected[0].document.definition.id)),previousCandidatesDigest:hash(db.prepare('SELECT * FROM security_candidates WHERE id<>? ORDER BY id').all(id)),adminAudit:admin,policyAudit:policy};
if(mode==='after'){
 const b=read('before-verification.json');
 for(const k of ['unrelatedDocumentsAndAnchorDigest','previousCandidatesDigest'])if(value[k]!==b[k])throw Error(`${k} changed; stop`);
 if(admin.length!==1||policy.length!==1||admin[0].revision!==11||policy[0].revision!==11||admin[0].actor_id!==pilot.securityAdmin||policy[0].actor_id!==pilot.securityAdmin||admin[0].application_id!==pilot.applicationId||admin[0].id!==result.auditId||policy[0].id!==result.auditId)throw Error('Mandatory audits mismatch; stop');
 if(JSON.stringify(b.activeDocuments[0].definition.rules.slice(0,7))!==JSON.stringify(active[0].definition.rules)||active[0].definition.rules.some(r=>r.permissionId==='ui.page.admin'))throw Error('Unexpected rule delta; stop');
 value.sevenRulesRetained=true;value.pageAdminRemoved=true;value.unrelatedPolicyAndAnchorPreserved=true;value.priorCandidatesPreserved=true;
}
db.close();fs.writeFileSync(new URL(`${mode}-verification.json`,here),JSON.stringify(value,null,2));console.log(JSON.stringify({mode,revision,result,ruleCount:active[0].definition.rules.length,administratorAudits:admin.length,policyAudits:policy.length}));
