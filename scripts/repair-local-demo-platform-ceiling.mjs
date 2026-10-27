// One-time, explicitly user-approved local development migration. Never a startup hook.
import { DatabaseSync, backup } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { SecurityDefinitionStore, SecurityDefinitionService, securityChecksum } from '@ui-platform/i-am/definitions';
import { canonicalChecksum } from '@ui-platform/versioned-definition-registry';
const database = 'C:/Projects/Modular/builder-demo/runtime/iam-v1-development.sqlite';
const output = 'C:/Projects/Modular/lock-quarantine/platform-permissions-' + Date.now();
const boundaryId = 'development.platform-security.boundary';
const additions = ['ui.platform.package.admin', 'ui.platform.automation.admin'];
const actorId = 'user-approved-local-demo-operator';
const reason = 'Explicit user approval: extend the local demo administrator grant ceiling for package and automation administration, then grant Platform Manager to admin@example.local.';
if (process.argv[2] !== '--apply-approved-local-change') throw new Error('Explicit invocation required.');
await mkdir(output, { recursive: true });
const connection = new DatabaseSync(database, { readOnly: true });
try { await backup(connection, output + '/before.sqlite'); await backup(connection, output + '/validation.sqlite'); }
finally { connection.close(); }
function migrate(file, expectedBefore) {
  const store = new SecurityDefinitionStore(file);
  try {
    const service = new SecurityDefinitionService(store), before = service.active();
    const digest = canonicalChecksum(before);
    if (expectedBefore && digest !== expectedBefore) throw new Error('Policy changed after validation.');
    const boundary = before.find(d => d.definition.id === boundaryId);
    if (boundary?.definition.kind !== 'grant-boundary' || boundary.definition.owner.kind !== 'platform' || boundary.definition.beneficiary.id !== 'development.platform-security.role' || boundary.definition.status !== 'active') throw new Error('Unexpected boundary.');
    const document = structuredClone(boundary);
    for (const permissionId of additions) {
      if (!before.some(d => d.definition.id === permissionId && d.definition.kind === 'permission' && d.definition.status === 'active')) throw new Error('Missing active permission.');
      if (!document.definition.permissions.some(p => p.permissionId === permissionId)) document.definition.permissions.push({ permissionId, scope: structuredClone(document.definition.scope), predicateTemplateIds: [] });
    }
    if (canonicalChecksum(document) === canonicalChecksum(boundary)) return { unchanged: true, beforeDigest: digest };
    const candidate = service.stage({ changes: [{ document, expectedChecksum: securityChecksum(boundary) }], expectedRevision: store.revision(), actorId, source: 'cli', idempotencyKey: randomUUID(), reason });
    if (!candidate.activatable) throw new Error(JSON.stringify(candidate.diagnostics));
    const result = store.activate(candidate.id, candidate.checksum, actorId, (live, request) => {
      if (canonicalChecksum(live) !== digest) throw new Error('Concurrent policy change.');
      const prepared = service.prepareActivation(live, request);
      if (!prepared.after || prepared.diagnostics.length) return prepared;
      const changed = prepared.after.filter(d => canonicalChecksum(d) !== canonicalChecksum(live.find(old => old.definition.id === d.definition.id)));
      if (changed.length !== 1 || changed[0].definition.id !== boundaryId || canonicalChecksum(changed[0]) !== canonicalChecksum(document)) throw new Error('Unexpected delta.');
      return { ...prepared, adminAudit: { kind: 'administration', operation: 'explicit-local-demo-ceiling-migration', actorId, targetIds: [boundaryId], applicationId: null, authorityPath: ['explicit-user-approved-local-operator'], reason, beforeDigest: digest, afterDigest: canonicalChecksum(prepared.after) } };
    });
    if (result.status !== 'activated') throw new Error(JSON.stringify(result));
    return { result, beforeDigest: digest, afterDigest: canonicalChecksum(service.active()), changedIds: [boundaryId] };
  } finally { store.close(); }
}
const validation = migrate(output + '/validation.sqlite');
const applied = migrate(database, validation.beforeDigest);
await writeFile(output + '/result.json', JSON.stringify({ validation, applied, additions, reason }, null, 2));
console.log(JSON.stringify({ output, applied }));

// Grant the role through the existing authenticated administration API.
const origin = 'http://localhost:5280';
const response = await fetch(origin + '/api/development-identity/session');
const cookie = response.headers.get('set-cookie')?.split(';')[0], session = await response.json();
const headers = { cookie, origin, 'content-type': 'application/json', 'x-v1-csrf': session.csrfToken };
async function post(route, body) {
  const res = await fetch(origin + route, { method: 'POST', headers, body: JSON.stringify(body) });
  const value = await res.json();
  if (!res.ok) throw new Error(JSON.stringify({ route, status: res.status, value }));
  return value;
}
await post('/api/development-identity/session', { email: 'security@example.local' });
const store = new SecurityDefinitionStore(database);
let revision;
try { revision = store.revision(); } finally { store.close(); }
const candidate = await post('/api/platform/security/stage', { expectedRevision: revision, reason, changes: [{ document: { format: 'ui-platform.security', formatVersion: 1, definition: {
  kind: 'role-assignment', id: 'local-demo-admin-platform-manager', status: 'active', userId: 'usr_f01e0c1c58424bed9ac4e8601ff9890a', roleId: 'v1.role.platform-admin',
  scope: { resource: { authorityId: 'ui-platform-development', applicationId: null, kind: 'system', id: 'platform' }, descendants: false }, startsAt: new Date().toISOString(), endsAt: null,
} } }] });
if (!candidate.activatable) throw new Error(JSON.stringify(candidate));
const grant = await post('/api/platform/security/activate', { candidateId: candidate.id, checksum: candidate.checksum, expectedRevision: candidate.baseRevision, reason });
await writeFile(output + '/grant.json', JSON.stringify(grant, null, 2));
console.log(JSON.stringify({ grant }));
