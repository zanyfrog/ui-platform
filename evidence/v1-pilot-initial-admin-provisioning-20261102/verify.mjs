import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
const before=JSON.parse(fs.readFileSync(new URL('./before.json',import.meta.url),'utf8'));
const after=JSON.parse(fs.readFileSync(new URL('./after.json',import.meta.url),'utf8'));
const applicationId='de8d1851-3e36-435f-b093-95ce94d940e7',prefix=`initial.${applicationId}`;
const addedIds=[applicationId,...['set','role','assignment','boundary'].map(s=>`${prefix}.${s}`)];
const db=new DatabaseSync('C:/Projects/Modular/builder-demo/runtime/iam-v1-development.sqlite',{readOnly:true});
const hash=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
try {
  const documents=db.prepare('SELECT * FROM security_documents').all();
  const added=documents.filter(r=>addedIds.includes(r.id)).map(r=>JSON.parse(r.json).definition);
  const assignment=added.find(r=>r.kind==='role-assignment'),set=added.find(r=>r.kind==='permission-set'),boundary=added.find(r=>r.kind==='grant-boundary');
  const audits=db.prepare('SELECT id,revision,kind,operation,actor_id,application_id,reason,occurred_at,candidate_id FROM security_admin_audit WHERE revision=8').all();
  const policyAudit=db.prepare('SELECT id,revision,actor_id,source,reason,occurred_at,candidate_id FROM security_audit WHERE revision=8').all();
  const candidate=audits[0]?.candidate_id;
  const previousTableUnchanged=(name,rows)=>hash(rows)===before.tables.find(t=>t.name===name)?.sha256;
  const files=new Map(after.files.map(f=>[f.path,f.sha256]));
  const result={applicationId,revision:db.prepare('SELECT revision FROM security_state').get().revision,
    addedRecordIds:added.map(r=>r.id),administratorUserId:assignment?.userId,assignmentScope:assignment?.scope,
    permissions:set?.rules.map(r=>({permissionId:r.permissionId,scope:r.scope})),boundaryScope:boundary?.scope,
    adminAudit:audits,policyAudit,
    preserved:{priorPolicyDocuments:previousTableUnchanged('security_documents',documents.filter(r=>!addedIds.includes(r.id))),
      priorAdminAudit:previousTableUnchanged('security_admin_audit',db.prepare('SELECT * FROM security_admin_audit WHERE revision<8').all()),
      priorPolicyAudit:previousTableUnchanged('security_audit',db.prepare('SELECT * FROM security_audit WHERE revision<8').all()),
      priorCandidates:previousTableUnchanged('security_candidates',db.prepare('SELECT * FROM security_candidates').all().filter(r=>r.id!==candidate)),
      registrations:JSON.stringify(before.registrations)===JSON.stringify(after.registrations),
      changedApplicationFiles:before.files.filter(f=>files.get(f.path)!==f.sha256).map(f=>f.path)}};
  fs.writeFileSync(new URL('./verification.json',import.meta.url),JSON.stringify(result,null,2)); console.log(JSON.stringify(result));
} finally {db.close();}
