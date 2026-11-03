import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
const read=name=>JSON.parse(fs.readFileSync(new URL(`./${name}.json`,import.meta.url),'utf8'));
const before=read('before'),after=read('after'),review=read('candidate-before');
const db=new DatabaseSync('C:/Projects/Modular/builder-demo/runtime/iam-v1-development.sqlite',{readOnly:true});
const hash=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
try{
  const candidate=db.prepare('SELECT * FROM security_candidates WHERE id=?').get(review.candidateId);
  assert.equal(candidate.checksum,review.checksum);assert.equal(candidate.base_revision,8);
  const result=JSON.parse(candidate.result_json);assert.equal(result.status,'activated');
  const records=db.prepare('SELECT * FROM security_documents').all();
  const ids=review.proposedRecords.map(r=>r.id);
  const active=records.filter(r=>ids.includes(r.id)).map(r=>JSON.parse(r.json).definition);
  assert.equal(active.length,3);
  for(const proposed of review.proposedRecords)assert.deepEqual(active.find(r=>r.id===proposed.id),proposed);
  const set=active.find(r=>r.kind==='permission-set');assert.equal(set.rules.length,7);assert.ok(!set.rules.some(r=>r.permissionId==='ui.page.admin'));
  const audit=db.prepare('SELECT id,revision,kind,operation,actor_id,application_id,reason,occurred_at,candidate_id FROM security_admin_audit WHERE revision=9').all();
  const policyAudit=db.prepare('SELECT id,revision,actor_id,source,reason,occurred_at,candidate_id FROM security_audit WHERE revision=9').all();
  assert.equal(audit.length,1);assert.equal(audit[0].candidate_id,review.candidateId);assert.equal(audit[0].actor_id,review.actorId);
  assert.equal(audit[0].application_id,'de8d1851-3e36-435f-b093-95ce94d940e7');
  const unchanged=(table,rows)=>hash(rows)===before.tables.find(t=>t.name===table)?.sha256;
  const priorCandidates=JSON.parse(fs.readFileSync(new URL('../v1-pilot-functional-stage-20261102/before.json',import.meta.url),'utf8'));
  const files=new Map(after.files.map(f=>[f.path,f.sha256]));
  const verification={candidateId:review.candidateId,checksum:candidate.checksum,baseRevision:candidate.base_revision,
    policyRevision:db.prepare('SELECT revision FROM security_state').get().revision,activationResult:result,
    activeRecords:active,adminAudit:audit,policyAudit,
    preservation:{priorActiveDocuments:unchanged('security_documents',records.filter(r=>!ids.includes(r.id))),
      priorAdminAudit:unchanged('security_admin_audit',db.prepare('SELECT * FROM security_admin_audit WHERE revision<9').all()),
      priorPolicyAudit:unchanged('security_audit',db.prepare('SELECT * FROM security_audit WHERE revision<9').all()),
      otherCandidatesUnchanged:hash(db.prepare('SELECT * FROM security_candidates').all().filter(r=>r.id!==review.candidateId))===priorCandidates.tables.find(t=>t.name==='security_candidates').sha256,
      registrationsUnchanged:JSON.stringify(before.registrations)===JSON.stringify(after.registrations),
      changedApplicationFiles:before.files.filter(f=>files.get(f.path)!==f.sha256).map(f=>f.path)}};
  fs.writeFileSync(new URL('./verification.json',import.meta.url),JSON.stringify(verification,null,2));
  console.log(JSON.stringify({...verification,activeRecords:active.map(r=>({id:r.id,kind:r.kind}))}));
}finally{db.close();}
