import {trace,step,traced,errorCode,traceId} from './refusal-trace.js';
import type { RequestListener } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { SecurityAdministrationService,AdministrationScopeAuthority } from '@ui-platform/i-am/administration';
import type { InternalVerifier } from './internal-trust.js';
import type { currentIam } from './current-iam.js';
import { securityChecksum, type SecurityDefinitionStore, type SecurityRecord } from '@ui-platform/i-am/definitions';
import { roleAdministrationState } from '../role-administration.js';
import { body, deny, exact, json } from './boundary.js';
import type { InventoryPredicateTemplates } from './predicate-templates.js';

/** Data-owned internal management listener. Only the separately credentialed management frontend may call it.
 * Uses WP3 staging/activation unchanged; never imported by public runtime. */
export function managementSecurityHandler(options: { authorityId: string; systemResourceId: string; managementApplicationId: string; iam: ReturnType<typeof currentIam>;
  verifier: InternalVerifier; administration: SecurityAdministrationService; applicationAdministratorPermissionId: string; platformAdministratorPermissionId: string;
  policy?: SecurityDefinitionStore; templates?: InventoryPredicateTemplates; administrationScopes?:AdministrationScopeAuthority; revokeSessions?: (applicationId:string,userId:string)=>Promise<void> }) : RequestListener {
  return traced('management-data',async (request, response) => {
    let lease: Awaited<ReturnType<typeof options.iam.lease>> | undefined;
    try {
      const match = /^\/management\/([A-Za-z0-9_.:-]+)\/security\/(stage|activate|provision|roles|assign|revoke|revoke-sessions|template-register|template-revoke)$/.exec(request.url ?? '');
      if (!match || request.method !== (match[2] === 'roles' ? 'GET' : 'POST')) { json(response, 404, { code: 'NOT_FOUND' }); return; }
      const bytes = await body(request, 100_000), actor = await step('management-data','internal-authenticate',()=>options.verifier.authenticate(request, bytes)), applicationId = match[1] === 'platform' ? null : match[1]!;
      if (actor.enrollment.applicationId !== options.managementApplicationId) deny();
      lease = await step('management-data','iam-lease',()=>options.iam.lease(actor));
      const platform = applicationId === null || match[2] === 'provision' || match[2] === 'template-register' || match[2] === 'template-revoke';
      const resource = platform ? { authorityId: options.authorityId, applicationId: null, kind: 'system' as const, id: options.systemResourceId } :
        { authorityId: options.authorityId, applicationId, kind: 'application' as const, id: applicationId };
      let assert:()=>Promise<void>;
      try { assert=await options.iam.authorize(lease.context, platform ? options.platformAdministratorPermissionId : options.applicationAdministratorPermissionId, resource); }
      catch(error){if(platform)throw error;assert=await options.iam.authorize(lease.context,options.platformAdministratorPermissionId,{authorityId:options.authorityId,applicationId:null,kind:'system',id:options.systemResourceId});}
      if (match[2] === 'roles') {
        if (!options.policy || !applicationId) deny(); const snapshot = options.policy.snapshot();
        const result = roleAdministrationState(snapshot.documents, applicationId, actor.enrollment.userId, snapshot.revision,
          { resourceAuthorityId: options.authorityId, systemResourceId: options.systemResourceId, platformAdministratorPermissionId: options.platformAdministratorPermissionId,
            applicationAdministratorPermissionId: options.applicationAdministratorPermissionId, deploymentId: 'runtime-management', recoveryCapabilityId: 'unavailable', bootstrapCapabilityId: 'unavailable' },options.administrationScopes);
        await step('management-data','authority-assert',()=>assert()); json(response, 200, result); return;
      }
      const input = JSON.parse(bytes.toString('utf8')); let result: unknown;
      if(match[2]==='template-register'||match[2]==='template-revoke'){
        if(!options.templates)deny();await step('management-data','authority-assert',()=>assert());result=await (match[2]==='template-register'?options.templates.register(lease.context,input):options.templates.revoke(lease.context,input));
      }else if(match[2]==='revoke-sessions'){
        exact(input,['userId']);if(!applicationId||!options.revokeSessions)deny();await step('management-data','authority-assert',()=>assert());await options.revokeSessions(applicationId,input.userId);result={revoked:true};
      }else if (match[2] === 'assign' || match[2] === 'revoke') {
        if (!options.policy || !applicationId) deny();
        exact(input, ['expectedRevision','reason'], match[2] === 'assign' ? ['userId','roleId','scope'] : ['assignmentId']);
        const snapshot = options.policy.snapshot(); if (snapshot.revision !== input.expectedRevision || !input.reason?.trim()) deny();
        let definition: SecurityRecord, expectedChecksum: string | undefined;
        if (match[2] === 'revoke') {
          const previous = snapshot.documents.find(d=>d.definition.kind === 'role-assignment' && d.definition.id === input.assignmentId);
          if (!previous || previous.definition.kind !== 'role-assignment' || previous.definition.scope.resource.applicationId !== applicationId) deny();
          expectedChecksum = securityChecksum(previous); definition = { ...previous.definition, status: 'inactive' };
        } else {
          if (input.scope?.resource?.applicationId !== applicationId) deny();
          definition = { kind: 'role-assignment', id: randomUUID(), status: 'active', roleId: input.roleId, userId: input.userId, scope: input.scope, startsAt: new Date().toISOString(), endsAt: null };
        }
        await step('management-data','authority-assert',()=>assert()); result = options.administration.stage({ changes: [{ document: { format:'ui-platform.security',formatVersion:1,definition }, ...(expectedChecksum?{expectedChecksum}:{}) }],
          expectedRevision: input.expectedRevision, reason: input.reason, actorId:actor.enrollment.userId, source:'api', idempotencyKey:randomUUID() });
      } else if (match[2] === 'stage') {
        exact(input, ['changes', 'expectedRevision', 'reason']); await step('management-data','authority-assert',()=>assert());
        result = options.administration.stage({ changes: input.changes, expectedRevision: input.expectedRevision, reason: input.reason,
          actorId: actor.enrollment.userId, source: 'api', idempotencyKey: randomUUID() });
      } else {
        exact(input, ['candidateId', 'checksum', 'expectedRevision', 'reason'], match[2] === 'provision' ? ['administratorUserId', 'administratorAssignmentId'] : []);
        await step('management-data','authority-assert',()=>assert());
        const activation = { context: lease.context, applicationId, candidateId: input.candidateId, checksum: input.checksum, expectedRevision: input.expectedRevision, reason: input.reason };
        if (match[2] === 'provision') {
          if (!applicationId) deny();
          result = await options.administration.provisionApplication({ ...activation, applicationId: applicationId!, administratorUserId: input.administratorUserId, administratorAssignmentId: input.administratorAssignmentId });
        } else result = await step('management-data','wp3-activate',()=>options.administration.activate(activation));trace('management-data','wp3-result',{status:String((result as any)?.status??'none'),diagnostic:String((result as any)?.diagnostics?.[0]?.code??'none')});
      }
      json(response, 200, result);
    } catch(error) { trace('management-data','catch',{code:errorCode(error)}); json(response, 403, { code: 'PROTECTED_REQUEST_DENIED' }); }
    finally { lease?.close(); }
  });
}
