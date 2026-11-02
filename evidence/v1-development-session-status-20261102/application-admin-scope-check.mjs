import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const db = new DatabaseSync('C:/Projects/Modular/builder-demo/runtime/iam-v1-development.sqlite', { readOnly: true });
try {
  const rows = db.prepare('SELECT * FROM security_documents').all();
  const digest = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  const prior = JSON.parse(readFileSync(new URL('./preservation.json', import.meta.url), 'utf8'));
  const records = rows.map(r => JSON.parse(r.json).definition);
  const principalId = 'usr_f01e0c1c58424bed9ac4e8601ff9890a';
  // Policy inventory only. No reconstructed authorization decision or synthetic evaluator context.
  const assignments = records.filter(r => r.kind === 'role-assignment' && r.userId === principalId).map(r => ({ status: r.status, roleId: r.roleId,
    authorityId: r.scope?.resource?.authorityId, applicationId: r.scope?.resource?.applicationId,
    kind: r.scope?.resource?.kind, resourceId: r.scope?.resource?.id, descendants: r.scope?.descendants }));
  const result = { principalId, evidenceKind: 'stored-policy-scope-inventory-not-live-authorization',
    policyDocumentsUnchangedSinceImplementationCheck: digest === prior.tables.find(t => t.name === 'security_documents')?.sha256, assignments };
  writeFileSync(new URL('./application-admin-scope-result.json', import.meta.url), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { db.close(); }
