import {trace,step,traced,errorCode,traceId} from './refusal-trace.js';
import { SecurityAuthorizationEvaluator, type AccessRequest, type PolicyAuthority, type ResourceAuthority } from '@ui-platform/i-am/evaluator';
import type { SecurityResourceRef } from '@ui-platform/i-am/definitions';
import type { InternalActor } from './internal-trust.js';
import type { IdentityDirectory } from './enrollment.js';
import { deny } from './boundary.js';

/** Existing I-AM owns all permission decisions. The host supplies only opaque authenticated contexts. */
export function currentIam(policy: PolicyAuthority, resources: ResourceAuthority, directory: IdentityDirectory, activeSession: (actor: InternalActor) => Promise<boolean>, options:{freshnessMs?:number}={}) {
  const freshnessMs=options.freshnessMs??1000;
  if(!Number.isSafeInteger(freshnessMs)||freshnessMs<1000||freshnessMs>15_000)deny();
  const handles = new WeakMap<object, InternalActor>(), requests = new WeakSet<AccessRequest>();
  const verify = async (context: unknown) => {
    const actor = context && typeof context === 'object' ? handles.get(context) : undefined;
    if (!actor || !await step('iam','directory-current',()=>directory.current(actor.enrollment)) || !await step('iam','session-current',()=>activeSession(actor))) deny();
    const snapshot = await policy.read(); if (!snapshot) deny();
    return { principal: { type: 'user' as const, id: actor!.enrollment.userId }, principalRevision: snapshot!.revision, sessionRevision: actor!.sessionId };
  };
  const identity = { verify, async attest(request: AccessRequest) { await verify(request.context); const copy = { ...request, fields: [...request.fields] }; requests.add(copy); return copy; },
    async assertRequest(request: AccessRequest) { if (!requests.has(request)) deny(); await verify(request.context); } };
  const plannerCapability = {};
  const evaluator = new SecurityAuthorizationEvaluator({ policy, resources, identity, plannerCapability,
    // Host time budget between checks, not an authority cache: assertCurrent and
    // assertPlannerCurrent still re-evaluate current policy, identity and session.
    facts: { async revision() { return 'no-runtime-facts'; }, async resolve() { return { present: false as const }; } }, freshnessMs });
  const administrationIdentity = {
    async verify(context: unknown) { const verified = await verify(context); return { actorId: verified.principal.id, principalRevision: verified.principalRevision, sessionRevision: verified.sessionRevision }; },
    attestDecisionRequest(context: unknown, resource: SecurityResourceRef, permissionId: string, operationId: string): AccessRequest {
      const request = { context, resource, permissionId, operationId, fields: [] }; requests.add(request); return request;
    },
  };
  return { identity, evaluator, plannerCapability, administrationIdentity,
    async lease(actor: InternalActor) { const context = Object.freeze({}); handles.set(context, structuredClone(actor)); await verify(context); return { context, close() { handles.delete(context); } }; },
    async authorize(context: object, permissionId: string, resource: SecurityResourceRef) {
      const request = await identity.attest({ context, permissionId, resource, operationId: permissionId, fields: [] });
      const decision = await step('iam','authorize',()=>evaluator.authorize(request));trace('iam','decision',{effect:decision.effect,reason:decision.reasonCode,policyRevision:decision.stamp.policyRevision,expiresAt:decision.stamp.expiresAt,now:Date.now()});
      if (decision.effect !== 'allow' || decision.conditional) deny();
      await step('iam','assert-current',()=>evaluator.assertCurrent(decision, request));
      return async () => { await step('iam','assert-current',()=>evaluator.assertCurrent(decision, request)); };
    },
  };
}
