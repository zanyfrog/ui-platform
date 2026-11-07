import {step,event} from './private-access-trace.js';
import type { RequestListener } from 'node:http';
import type { SecuredDatasetOperationEngine, TrustedDatasetExecution } from '@ui-platform/dataset-operations';
import type { InternalVerifier } from './internal-trust.js';
import type { currentIam } from './current-iam.js';
import type { ReleasedContracts } from './releases.js';
import type { PrivateAssets } from './private-assets.js';
import { body, deny, json } from './boundary.js';

/** Data process receives only authenticated, release-qualified runtime requests. Management is a separate handler/service. */
export function protectedDataHandler(options: { authorityId: string; verifier: InternalVerifier; iam: ReturnType<typeof currentIam>;
  contracts: ReleasedContracts; engine: SecuredDatasetOperationEngine; assets: PrivateAssets }): RequestListener {
  return async (request, response) => {
    let lease: Awaited<ReturnType<typeof options.iam.lease>> | undefined;
    try {
      const bytes = await body(request), actor = await options.verifier.authenticate(request, bytes);
      lease = await step('iam.lease',()=>options.iam.lease(actor));
      const applicationId = actor.enrollment.applicationId;
      const trusted: TrustedDatasetExecution = { context: lease.context, actor: { type: 'user', userId: actor.enrollment.userId }, applicationId, authorityId: options.authorityId, source: { type: 'api' } };
      if (request.url === '/runtime/execute' && request.method === 'POST') {
        const input = JSON.parse(bytes.toString('utf8')); if (input.releaseId !== actor.releaseId) deny();
        const result = await options.contracts.execute(options.engine, trusted, input, async metadata => options.iam.authorize(lease!.context,
          metadata.kind === 'page' ? 'ui.page.view' : 'ui.artifact.view', { authorityId: options.authorityId, applicationId, kind: metadata.kind === 'page' ? 'page' : 'artifact', id: metadata.componentId ?? metadata.artifactId, parentId: applicationId }));
        json(response, 200, result); return;
      }
      const match = /^\/runtime\/assets\/([A-Za-z0-9_.:-]+)\/([A-Za-z0-9_.:-]+)\/(metadata|thumbnail|download)$/.exec(request.url ?? '');
      if (match) {
        await step('release.lease',()=>options.contracts.lease(applicationId,actor.releaseId));
        await options.assets.reply(request, response, applicationId, match[1]!, match[2]!, match[3] as 'metadata' | 'thumbnail' | 'download',
          () => options.iam.authorize(lease!.context, 'ui.artifact.view', { authorityId: options.authorityId, applicationId, kind: 'artifact', id: match[1]!, parentId: applicationId })); return;
      }
      json(response, 404, { code: 'NOT_FOUND' });
    } catch { event('data-handler:denied');json(response, 403, { code: 'PROTECTED_REQUEST_DENIED' }); }
    finally { lease?.close(); }
  };
}
