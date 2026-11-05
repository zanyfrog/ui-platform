import { SecurityAuthorizationEvaluator, type AccessRequest, type PolicyAuthority, type ResourceAuthority } from '@ui-platform/i-am/evaluator';
import type { SecurityResourceRef } from '@ui-platform/i-am/definitions';
import type { InternalActor } from './internal-trust.js';
import type { IdentityDirectory } from './enrollment.js';
import { deny } from './boundary.js';

/** Existing I-AM owns all permission decisions. The host supplies only opaque authenticated contexts. */
export function currentIam(policy: PolicyAuthority, resources: ResourceAuthority, directory: IdentityDirectory, activeSession: (actor: InternalActor) => Promise<boolean>) {
  const handles = new WeakMap<object, InternalActor>(), requests = new WeakSet<AccessRequest>();
  const verify = async (context: unknown) => {
    const actor = context && typeof context === 'object' ? handles.get(context) : undefined;
    if (!actor || !await directory.current(actor.enrollment) || !await activeSession(actor)) deny();
    const snapshot = await policy.read(); if (!snapshot) deny();
    return { principal: { type: 'user' as const, id: actor!.enrollment.userId }, principalRevision: snapshot!.revision, sessionRevision: actor!.sessionId };
  };
  const identity = { verify, async attest(request: AccessRequest) { await verify(request.context); const copy = { ...request, fields: [...request.fields] }; requests.add(copy); return copy; },
    async assertRequest(request: AccessRequest) { if (!requests.has(request)) deny(); await verify(request.context); } };
  const plannerCapability = {};
  const evaluator = new SecurityAuthorizationEvaluator({ policy, resources, identity, plannerCapability,
    facts: { async revision() { return 'no-runtime-facts'; }, async resolve() { return { present: false as const }; } }, freshnessMs: 1000 });
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
      const decision = await evaluator.authorize(request);
      if (decision.effect !== 'allow' || decision.conditional) deny();
      await evaluator.assertCurrent(decision, request);
      return async () => { await evaluator.assertCurrent(decision, request); };
    },
  };
}
