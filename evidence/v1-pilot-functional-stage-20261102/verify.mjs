import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const read=name=>JSON.parse(fs.readFileSync(new URL(`./${name}.json`,import.meta.url),'utf8'));
const before=read('before'),after=read('after');
const candidateId='620e2102-a549-47e9-8aa6-f564fa50f74b';
const checksum='sha256:bd8d448c2d63573a51e3cf2960366ffc05569b5e5cc02c4b9a528075015ad9f8';
const applicationId='de8d1851-3e36-435f-b093-95ce94d940e7',userId='usr_f01e0c1c58424bed9ac4e8601ff9890a';
const expected=['ui.application.view','ui.application.edit','ui.page.view','ui.page.edit','ui.presentation.view','ui.presentation.edit','ui.presentation.admin'];
const db=new DatabaseSync('C:/Projects/Modular/builder-demo/runtime/iam-v1-development.sqlite',{readOnly:true});
try {
  const row=db.prepare('SELECT * FROM security_candidates WHERE id=?').get(candidateId);
  const request=JSON.parse(row.request_json),diagnostics=JSON.parse(row.diagnostics_json);
  const proposed=request.changes.map(c=>c.document.definition),set=proposed.find(r=>r.kind==='permission-set'),assignment=proposed.find(r=>r.kind==='role-assignment');
  assert.equal(row.checksum,checksum);assert.equal(row.base_revision,8);assert.equal(row.result_json,null);assert.deepEqual(diagnostics,[]);
  assert.deepEqual(set.rules.map(r=>r.permissionId),expected);assert.equal(proposed.length,3);assert.equal(assignment.userId,userId);
  for(const rule of set.rules){assert.equal(rule.effect,'allow');assert.equal(rule.scope.resource.authorityId,'ui-platform-development');assert.equal(rule.scope.resource.applicationId,applicationId);assert.equal(rule.scope.resource.id,applicationId);assert.equal(rule.scope.resource.kind,'application');assert.equal(rule.scope.descendants,!rule.permissionId.startsWith('ui.application.'));}
  assert.equal(assignment.scope.resource.id,applicationId);assert.equal(assignment.scope.descendants,true);
  const files=new Map(after.files.map(f=>[f.path,f.sha256]));
  const oldCandidates=db.prepare('SELECT * FROM security_candidates').all().filter(r=>r.id!==candidateId);
  const priorCandidatesUnchanged=createHash('sha256').update(JSON.stringify(oldCandidates)).digest('hex')===before.tables.find(t=>t.name==='security_candidates').sha256;
  const result={candidateId,checksum,baseRevision:row.base_revision,currentPolicyRevision:db.prepare('SELECT revision FROM security_state').get().revision,
    diagnostics,activationResult:null,actorId:request.actorId,source:request.source,reason:request.reason,proposedRecords:proposed,
    activeProposedAssignmentPresent:!!db.prepare('SELECT id FROM security_documents WHERE id=?').get(assignment.id),
    preservation:{priorCandidatesUnchanged,changedApplicationFiles:before.files.filter(f=>files.get(f.path)!==f.sha256).map(f=>f.path),
      registrationsUnchanged:JSON.stringify(before.registrations)===JSON.stringify(after.registrations),
      unchangedSecurityTables:before.tables.filter(t=>after.tables.some(a=>a.name===t.name&&a.sha256===t.sha256)).map(t=>t.name)}};
  fs.writeFileSync(new URL('./candidate-review.json',import.meta.url),JSON.stringify(result,null,2));
  console.log(JSON.stringify({...result,proposedRecords:proposed.map(r=>({id:r.id,kind:r.kind}))}));
}finally{db.close();}
