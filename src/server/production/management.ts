import type { RequestListener } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { SecurityAdministrationService } from '@ui-platform/i-am/administration';
import type { InternalVerifier } from './internal-trust.js';
import type { currentIam } from './current-iam.js';
import { body, deny, exact, json } from './boundary.js';

/** Data-owned internal management listener. Only the separately credentialed management frontend may call it.
 * Uses WP3 staging/activation unchanged; never imported by public runtime. */
export function managementSecurityHandler(options: { authorityId: string; systemResourceId: string; managementApplicationId: string; iam: ReturnType<typeof currentIam>;
  verifier: InternalVerifier; administration: SecurityAdministrationService; applicationAdministratorPermissionId: string; platformAdministratorPermissionId: string }) : RequestListener {
  return async (request, response) => {
    let lease: Awaited<ReturnType<typeof options.iam.lease>> | undefined;
    try {
      const match = /^\/management\/([A-Za-z0-9_.:-]+)\/security\/(stage|activate|provision)$/.exec(request.url ?? '');
      if (!match || request.method !== 'POST') { json(response, 404, { code: 'NOT_FOUND' }); return; }
      const bytes = await body(request, 100_000), actor = await options.verifier.authenticate(request, bytes), applicationId = match[1] === 'platform' ? null : match[1]!;
      if (actor.enrollment.applicationId !== options.managementApplicationId) deny();
      lease = await options.iam.lease(actor);
      const platform = applicationId === null || match[2] === 'provision';
      const resource = platform ? { authorityId: options.authorityId, applicationId: null, kind: 'system' as const, id: options.systemResourceId } :
        { authorityId: options.authorityId, applicationId, kind: 'application' as const, id: applicationId };
      const assert = await options.iam.authorize(lease.context, platform ? options.platformAdministratorPermissionId : options.applicationAdministratorPermissionId, resource);
      const input = JSON.parse(bytes.toString('utf8')); let result: unknown;
      if (match[2] === 'stage') {
        exact(input, ['changes', 'expectedRevision', 'reason']); await assert();
        result = options.administration.stage({ changes: input.changes, expectedRevision: input.expectedRevision, reason: input.reason,
          actorId: actor.enrollment.userId, source: 'api', idempotencyKey: randomUUID() });
      } else {
        exact(input, ['candidateId', 'checksum', 'expectedRevision', 'reason'], match[2] === 'provision' ? ['administratorUserId', 'administratorAssignmentId'] : []);
        await assert();
        const activation = { context: lease.context, applicationId, candidateId: input.candidateId, checksum: input.checksum, expectedRevision: input.expectedRevision, reason: input.reason };
        if (match[2] === 'provision') {
          if (!applicationId) deny();
          result = await options.administration.provisionApplication({ ...activation, applicationId: applicationId!, administratorUserId: input.administratorUserId, administratorAssignmentId: input.administratorAssignmentId });
        } else result = await options.administration.activate(activation);
      }
      json(response, 200, result);
    } catch { json(response, 403, { code: 'PROTECTED_REQUEST_DENIED' }); }
    finally { lease?.close(); }
  };
}
