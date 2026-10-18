import path from 'node:path';
import { referenceNotification } from '../src/server/automation-services.js';
import { AutomationStore } from '../src/server/automation-store.js';
import { AutomationRuntime, AutomationAuditLog, type AutomationAudit, type RegisteredAutomationService } from '../src/server/automation-runtime.js';
import { startFormReference } from './form-reference-host.js';
import { randomUUID } from 'node:crypto';
import { SecurityDefinitionStore, SecurityDefinitionService } from '@ui-platform/i-am/definitions';
import { V1_AUTHORITY_ID, developmentUsers } from '../src/server/v1-development-policy.js';
export async function startAutomationReference(port?: number, auditOutput?: (entry: AutomationAudit) => void) {
  const notifications: unknown[] = [];
  const candidate = referenceNotification(notifications);
  const services = new Map<string, RegisteredAutomationService>([['reference.notification', { transactional: false, invoke: candidate.invoke }]]);
  const runtime = new AutomationRuntime(new AutomationStore(path.resolve('triggers'), 'trigger'), new AutomationStore(path.resolve('workflows'), 'workflow'), services, new AutomationAuditLog(500, auditOutput));
  const host = await startFormReference(port, ({ engine, triggers, resolveDataset }) => {
    runtime.connect(triggers, resolveDataset);
    return { workflow: (input, trusted) => runtime.workflow(input.workflowId, input.primaryRecordId, trusted, engine) };
  });
  // Explicit reference fixture assignment; ordinary application administrators receive no Platform authority.
  const store = new SecurityDefinitionStore(host.policyPath);
  try {
    const service = new SecurityDefinitionService(store);
    const candidate = service.stage({ changes: [{ document: { format: 'ui-platform.security', formatVersion: 1, definition: {
      kind: 'role-assignment', id: 'automation-reference-platform-manager', status: 'active', userId: developmentUsers[1].id, roleId: 'v1.role.platform-admin',
      scope: { resource: { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system', id: 'platform' }, descendants: false }, startsAt: '2026-01-01T00:00:00Z', endsAt: null,
    } } }], expectedRevision: store.revision(), actorId: 'automation-reference-fixture', source: 'cli', idempotencyKey: randomUUID() });
    if (!candidate.activatable || service.activate(candidate.id, candidate.checksum, 'automation-reference-fixture').status !== 'activated') throw new Error('REFERENCE_POLICY_FAILED');
  } finally { store.close(); }
  return { ...host, runtime, notifications };
}
