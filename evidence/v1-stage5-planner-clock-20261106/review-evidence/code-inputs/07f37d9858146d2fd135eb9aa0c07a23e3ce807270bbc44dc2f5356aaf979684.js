import { randomUUID } from "node:crypto";
import { canonicalChecksum } from "@ui-platform/versioned-definition-registry";
import { assignmentEffectiveAt, validateSecurityDocument, validateSecurityGraph } from "../wp1/validation.js";
const validId = (x) => typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(x);
const same = (a, b) => canonicalChecksum(a) === canonicalChecksum(b);
const kinds = new Set(["system", "application", "dataset", "record", "field", "page", "form", "trigger", "workflow", "artifact", "security-definition"]);
const usages = new Set(["read", "write", "filter", "sort", "group", "aggregate", "join", "export"]);
const publicFaultCodes = new Set(["TRUSTED_TIME_INVALID", "PRINCIPAL_INVALID", "PRINCIPAL_INACTIVE", "REQUEST_INVALID", "POLICY_UNAVAILABLE", "POLICY_MALFORMED", "POLICY_CORRUPT", "PERMISSION_UNAVAILABLE", "PERMISSION_KIND_INVALID", "REVISION_INVALID", "RESOURCE_RELATIONSHIP_INVALID", "RESOURCE_UNKNOWN", "FIELD_RESOURCE_INVALID", "FIELD_SELECTION_REQUIRED", "RECORD_BINDING_UNAVAILABLE", "TRUSTED_FACT_MISSING", "PREDICATE_UNEVALUABLE", "REVISION_CHANGED", "DECISION_EXPIRED"]);
function requestShape(request) {
    const r = request?.resource;
    return !!r && validId(r.authorityId) && validId(r.id) && kinds.has(r.kind) &&
        (r.kind === "system" ? r.applicationId === null : validId(r.applicationId)) &&
        (r.kind !== "application" || r.id === r.applicationId) &&
        (r.kind !== "field" && r.kind !== "record" || validId(r.parentId)) &&
        (r.kind !== "record" || !!r.recordKey && ((r.recordKey.type === "string" && typeof r.recordKey.value === "string") || (r.recordKey.type === "number" && typeof r.recordKey.value === "number" && Number.isFinite(r.recordKey.value)))) &&
        validId(request.permissionId) && validId(request.operationId) && Array.isArray(request.fields) &&
        request.fields.every(f => validId(f.fieldId) && usages.has(f.usage)) &&
        new Set(request.fields.map(f => `${f.fieldId}:${f.usage}`)).size === request.fields.length &&
        (request.records === undefined || Array.isArray(request.records));
}
function parentKind(child, parent) {
    if (child.kind === "application")
        return parent.kind === "system" && parent.applicationId === null;
    if (child.kind === "record" || child.kind === "field")
        return parent.kind === "dataset" && child.parentId === parent.id;
    return parent.kind === "application" && child.applicationId === parent.id;
}
async function ancestry(ref, dep) {
    const path = [], seen = new Set();
    let current = ref;
    while (current) {
        const key = `${current.authorityId}:${current.kind}:${current.id}`;
        if (seen.has(key) || path.length > 8)
            throw new Error("RESOURCE_RELATIONSHIP_INVALID");
        seen.add(key);
        const descriptor = await dep.resources.resolve(current);
        if (!descriptor || descriptor.status !== "active" || !same(descriptor.ref, current))
            throw new Error("RESOURCE_UNKNOWN");
        path.push(current);
        const parent = descriptor.parent;
        if (!parent) {
            if (current.kind !== "system")
                throw new Error("RESOURCE_RELATIONSHIP_INVALID");
            break;
        }
        if (current.kind === "system" || current.authorityId !== parent.authorityId || !parentKind(current, parent) ||
            (current.parentId !== undefined && current.parentId !== parent.id) ||
            (current.kind !== "application" && current.applicationId !== parent.applicationId))
            throw new Error("RESOURCE_RELATIONSHIP_INVALID");
        current = parent;
    }
    return path;
}
function covers(scope, path) {
    const i = path.findIndex(ref => same(ref, scope.resource));
    return i === 0 || (i > 0 && scope.descendants);
}
function collectFacts(node, out = new Set()) {
    if (node.op === "and" || node.op === "or")
        node.args.forEach(x => collectFacts(x, out));
    else if (node.op === "not")
        collectFacts(node.arg, out);
    else if ("left" in node) {
        if (node.left.kind === "fact")
            out.add(node.left.factId);
        if (node.right.kind === "fact")
            out.add(node.right.factId);
    }
    return out;
}
function collectFields(node, out = new Set()) {
    if (node.op === "and" || node.op === "or")
        node.args.forEach(x => collectFields(x, out));
    else if (node.op === "not")
        collectFields(node.arg, out);
    else if ("left" in node) {
        if (node.left.kind === "field")
            out.add(node.left.fieldId);
        if (node.right.kind === "field")
            out.add(node.right.fieldId);
    }
    return out;
}
function predicate(node, record, facts) {
    if (node.op === "true")
        return "yes";
    if (node.op === "false")
        return "no";
    if (node.op === "not") {
        const x = predicate(node.arg, record, facts);
        return x === "yes" ? "no" : x === "no" ? "yes" : x;
    }
    if (node.op === "and" || node.op === "or") {
        const xs = node.args.map(x => predicate(x, record, facts));
        if (xs.includes("error"))
            return "error";
        if (node.op === "and" && xs.includes("no"))
            return "no";
        if (node.op === "or" && xs.includes("yes"))
            return "yes";
        if (xs.includes("needs-record"))
            return "needs-record";
        return node.op === "and" ? "yes" : "no";
    }
    if (!("left" in node))
        return "error";
    const operand = (v) => {
        if (v.kind === "literal")
            return { value: v.value, status: "yes" };
        if (v.kind === "fact")
            return facts.has(v.factId) ? { value: facts.get(v.factId), status: "yes" } : { status: "error" };
        if (!record)
            return { status: "needs-record" };
        const row = record.after ?? record.before;
        return row && Object.hasOwn(row, v.fieldId) ? { value: row[v.fieldId], status: "yes" } : { status: "error" };
    };
    const left = operand(node.left), right = operand(node.right);
    if (left.status === "error" || right.status === "error")
        return "error";
    if (left.status === "needs-record" || right.status === "needs-record")
        return "needs-record";
    const a = left.value, b = right.value;
    const scalar = (v) => v === null || typeof v === "string" || typeof v === "boolean" || typeof v === "number" && Number.isFinite(v);
    if (node.op === "in")
        return scalar(a) && Array.isArray(b) && b.every(scalar) ? (b.some(x => Object.is(x, a)) ? "yes" : "no") : "error";
    if (!scalar(a) || !scalar(b))
        return "error";
    if (node.op === "eq")
        return Object.is(a, b) ? "yes" : "no";
    if (node.op === "ne")
        return Object.is(a, b) ? "no" : "yes";
    if (typeof a !== typeof b || (typeof a !== "number" && typeof a !== "string"))
        return "error";
    const x = a, y = b;
    return (node.op === "gt" ? x > y : node.op === "gte" ? x >= y : node.op === "lt" ? x < y : x <= y) ? "yes" : "no";
}
/** WP2 decision engine. No HTTP authentication, DOE enforcement, or production cache authority. */
export class SecurityAuthorizationEvaluator {
    dep;
    issued = new WeakMap();
    plannerFacts = new WeakMap();
    constructor(dep) {
        this.dep = dep;
    }
    /** Trusted planner evidence retains WP2's exact path/row/field semantics. */
    async planEvidence(request, capability) {
        if (!this.dep.plannerCapability || capability !== this.dep.plannerCapability)
            throw new Error("PLANNER_CAPABILITY_DENIED");
        return this.evaluate(request, true);
    }
    /** Facts are available only to the host-capability planner, never to ordinary explanations. */
    trustedPlanFacts(decision, capability) {
        if (!this.dep.plannerCapability || capability !== this.dep.plannerCapability ||
            this.issued.get(decision) !== canonicalChecksum(decision) || !this.plannerFacts.has(decision))
            throw new Error("PLANNER_CAPABILITY_DENIED");
        return new Map(this.plannerFacts.get(decision));
    }
    clock() { const now = (this.dep.clock ?? (() => new Date()))(); if (!Number.isFinite(now.getTime()))
        throw new Error("TRUSTED_TIME_INVALID"); return now; }
    async load() {
        const snapshot = await this.dep.policy.read();
        if (!snapshot || !validId(snapshot.revision) || !Array.isArray(snapshot.documents))
            throw new Error("POLICY_UNAVAILABLE");
        const documents = snapshot.documents.map(value => {
            const parsed = validateSecurityDocument(value);
            if (!parsed.document || parsed.diagnostics.length)
                throw new Error("POLICY_MALFORMED");
            return parsed.document;
        });
        const records = documents.map(x => x.definition);
        if (validateSecurityGraph(records, this.dep.publications).length)
            throw new Error("POLICY_CORRUPT");
        return { revision: snapshot.revision, records };
    }
    candidates(records, principal, now) {
        const byId = new Map(records.map(x => [x.id, x]));
        const output = [];
        const visit = (setId, assignmentId, via, eligible, reason, assignmentScope, applicationId) => {
            const set = byId.get(setId);
            const nextVia = [...via, { kind: "permission-set", id: setId }];
            const active = eligible && set.status === "active";
            const why = reason ?? (set.status === "active" ? undefined : "SET_INACTIVE");
            for (const rule of set.rules)
                output.push({ assignmentId, via: nextVia, rule, eligible: active, reason: why, assignmentScope, applicationId });
            for (const child of set.includes)
                visit(child.id, assignmentId, nextVia, active, why, assignmentScope, applicationId);
        };
        for (const record of records) {
            if (principal.type === "user" && record.kind === "role-assignment" && record.userId === principal.id) {
                const role = byId.get(record.roleId);
                if (role?.kind !== "role")
                    throw new Error("POLICY_CORRUPT");
                const active = assignmentEffectiveAt(record, now) && role.status === "active";
                const reason = !assignmentEffectiveAt(record, now) ? "ASSIGNMENT_INEFFECTIVE" : role.status !== "active" ? "ROLE_INACTIVE" : undefined;
                for (const ref of role.permissionSets)
                    visit(ref.id, record.id, [{ kind: "role", id: role.id }], active, reason, record.scope);
            }
            if (principal.type === "user" && record.kind === "group-membership" && record.userId === principal.id) {
                const group = byId.get(record.groupId);
                if (group?.kind !== "group")
                    throw new Error("POLICY_CORRUPT");
                const active = assignmentEffectiveAt(record, now) && group.status === "active";
                const reason = !assignmentEffectiveAt(record, now) ? "MEMBERSHIP_INEFFECTIVE" : group.status !== "active" ? "GROUP_INACTIVE" : undefined;
                for (const ref of group.permissionSets)
                    visit(ref.id, record.id, [{ kind: "group", id: group.id }], active, reason, undefined, record.applicationId);
            }
            if (principal.type === "service" && record.kind === "service-assignment" && record.serviceId === principal.id) {
                const active = assignmentEffectiveAt(record, now);
                visit(record.permissionSet.id, record.id, [{ kind: "service-assignment", id: record.id }], active, active ? undefined : "ASSIGNMENT_INEFFECTIVE", record.scope);
            }
        }
        return output;
    }
    async evaluate(request, fullExplanation) {
        const now = this.clock();
        let principal, stamp;
        let digest = "sha256:unavailable";
        const provenance = [];
        const evaluatedCells = [];
        const plannerFacts = new Map();
        let conditional = false;
        let reasonCode = "NO_APPLICABLE_ALLOW";
        let effect = "deny";
        try {
            const identity = await this.dep.identity.verify(request.context);
            principal = identity.principal;
            if (!principal || !validId(principal.id) || !["user", "service"].includes(principal.type) || !validId(identity.principalRevision) || !validId(identity.sessionRevision))
                throw new Error("PRINCIPAL_INVALID");
            await this.dep.identity.assertRequest(request);
            if (!requestShape(request))
                throw new Error("REQUEST_INVALID");
            digest = canonicalChecksum({ principal, resource: request.resource, permissionId: request.permissionId, operationId: request.operationId, fields: request.fields, records: request.records ?? null });
            const policy = await this.load();
            const byId = new Map(policy.records.map(x => [x.id, x]));
            const subject = byId.get(principal.id);
            if (!subject || subject.kind !== principal.type || subject.status !== "active")
                throw new Error("PRINCIPAL_INACTIVE");
            const permission = byId.get(request.permissionId);
            if (!permission || permission.kind !== "permission" || permission.status !== "active" || permission.lifecycle === "retired")
                throw new Error("PERMISSION_UNAVAILABLE");
            if (!permission.applicableKinds.includes(request.resource.kind))
                throw new Error("PERMISSION_KIND_INVALID");
            const resourceRevision = await this.dep.resources.revision(), factRevision = await this.dep.facts.revision();
            if (!validId(resourceRevision) || !validId(factRevision))
                throw new Error("REVISION_INVALID");
            const path = await ancestry(request.resource, this.dep);
            const fieldPaths = new Map();
            for (const field of request.fields) {
                const ref = { authorityId: request.resource.authorityId, applicationId: request.resource.applicationId, kind: "field", id: field.fieldId, parentId: request.resource.kind === "dataset" ? request.resource.id : request.resource.parentId };
                if (!ref.parentId || request.resource.kind !== "dataset")
                    throw new Error("FIELD_RESOURCE_INVALID");
                fieldPaths.set(field.fieldId, await ancestry(ref, this.dep));
            }
            const coversCell = (scope, fieldId) => covers(scope, path) ||
                (scope.resource.kind === "field" && fieldId !== null && !!fieldPaths.get(fieldId) && covers(scope, fieldPaths.get(fieldId)));
            const coversAnyCell = (scope) => covers(scope, path) || [...fieldPaths.keys()].some(id => coversCell(scope, id));
            const candidates = this.candidates(policy.records, principal, now);
            const checkedScopes = new Set();
            for (const candidate of candidates) {
                for (const scope of [candidate.assignmentScope, candidate.rule.scope])
                    if (scope) {
                        const key = canonicalChecksum(scope.resource);
                        if (!checkedScopes.has(key)) {
                            await ancestry(scope.resource, this.dep);
                            checkedScopes.add(key);
                        }
                    }
                if (candidate.eligible && candidate.rule.permissionId === request.permissionId && request.resource.kind === "dataset") {
                    const recordScope = [candidate.rule.scope, candidate.assignmentScope].find(scope => scope?.resource.kind === "record" && scope.resource.applicationId === request.resource.applicationId && scope.resource.parentId === request.resource.id);
                    if (recordScope)
                        throw new Error("RECORD_BINDING_UNAVAILABLE");
                    const narrowDeny = candidate.rule.effect === "deny" && !request.fields.length &&
                        (candidate.rule.fields?.length || candidate.rule.scope.resource.kind === "field" && candidate.rule.scope.resource.parentId === request.resource.id) &&
                        (covers(candidate.rule.scope, path) || candidate.rule.scope.resource.kind === "field");
                    if (narrowDeny)
                        throw new Error("FIELD_SELECTION_REQUIRED");
                }
                if (candidate.eligible && candidate.rule.permissionId === request.permissionId && coversAnyCell(candidate.rule.scope)) {
                    const fields = new Set([...(candidate.rule.fields ?? []), ...collectFields(candidate.rule.where ?? { op: "true" })]);
                    if (fields.size && request.resource.kind !== "dataset")
                        throw new Error("FIELD_RESOURCE_INVALID");
                    for (const id of fields) {
                        const ref = { authorityId: request.resource.authorityId, applicationId: request.resource.applicationId, kind: "field", id, parentId: request.resource.id };
                        await ancestry(ref, this.dep);
                    }
                }
            }
            const facts = plannerFacts;
            for (const candidate of candidates)
                if (candidate.eligible && candidate.rule.permissionId === request.permissionId) {
                    for (const id of collectFacts(candidate.rule.where ?? { op: "true" }))
                        if (!facts.has(id)) {
                            const resolved = await this.dep.facts.resolve(id, principal);
                            if (!resolved.present)
                                throw new Error("TRUSTED_FACT_MISSING");
                            facts.set(id, resolved.value);
                        }
                }
            const cells = [];
            const rows = request.records?.length ? request.records.map((record, recordIndex) => ({ record, recordIndex, fieldId: null })) : [{ recordIndex: null, fieldId: null }];
            for (const row of rows)
                for (const fieldId of (request.fields.length ? request.fields.map(f => f.fieldId) : [null]))
                    cells.push({ ...row, fieldId });
            for (const cell of cells) {
                const allows = new Set(), denies = new Set();
                for (const candidate of candidates) {
                    const rule = candidate.rule;
                    let why = candidate.reason;
                    if (!why && rule.permissionId !== request.permissionId)
                        why = "PERMISSION_MISMATCH";
                    if (!why && candidate.assignmentScope && !coversCell(candidate.assignmentScope, cell.fieldId))
                        why = "ASSIGNMENT_SCOPE_MISMATCH";
                    if (!why && candidate.applicationId && candidate.applicationId !== request.resource.applicationId)
                        why = "MEMBERSHIP_APPLICATION_MISMATCH";
                    if (!why && !coversCell(rule.scope, cell.fieldId))
                        why = "SCOPE_MISMATCH";
                    if (!why && cell.fieldId === null && rule.fields)
                        why = "FIELD_SPECIFIC";
                    if (!why && cell.fieldId !== null && rule.fields && !rule.fields.includes(cell.fieldId))
                        why = "FIELD_MISMATCH";
                    if (!why) {
                        const result = predicate(rule.where ?? { op: "true" }, cell.record, facts);
                        if (result === "error")
                            throw new Error("PREDICATE_UNEVALUABLE");
                        if (result === "needs-record") {
                            conditional = true;
                            why = "RECORD_REQUIRED";
                        }
                        if (result === "no")
                            why = "PREDICATE_FALSE";
                    }
                    if (!why)
                        (rule.effect === "deny" ? denies : allows).add(rule.id);
                    if (fullExplanation)
                        provenance.push({ assignmentId: candidate.assignmentId, via: candidate.via, ruleId: rule.id, effect: rule.effect, applicable: !why, recordIndex: cell.recordIndex, fieldId: cell.fieldId, ruleScope: rule.scope, ...(candidate.assignmentScope ? { assignmentScope: candidate.assignmentScope } : {}), ...(why ? { reasonCode: why } : {}) });
                }
                evaluatedCells.push({ recordIndex: cell.recordIndex, fieldId: cell.fieldId, allowRuleIds: [...allows].sort(), denyRuleIds: [...denies].sort(), allowed: allows.size > 0 && denies.size === 0 && !conditional });
            }
            const verifiedAgain = await this.dep.identity.verify(request.context);
            if (!same(verifiedAgain, identity) || await this.dep.resources.revision() !== resourceRevision || await this.dep.facts.revision() !== factRevision || (await this.dep.policy.read()).revision !== policy.revision)
                throw new Error("REVISION_CHANGED");
            const until = Math.min(now.getTime() + Math.max(1, Math.min(this.dep.freshnessMs ?? 1000, 60_000)), ...policy.records.filter(x => (x.kind === "role-assignment" && x.userId === principal.id || x.kind === "group-membership" && x.userId === principal.id || x.kind === "service-assignment" && x.serviceId === principal.id) && x.endsAt !== null && assignmentEffectiveAt(x, now)).map(x => Date.parse(x.endsAt)));
            if (this.clock().getTime() >= until)
                throw new Error("DECISION_EXPIRED");
            stamp = { authorityId: request.resource.authorityId, policyRevision: policy.revision, principalRevision: identity.principalRevision, sessionRevision: identity.sessionRevision, resourceRevision, factRevision, evaluatedAt: now.toISOString(), expiresAt: new Date(until).toISOString() };
            if (evaluatedCells.some(c => c.denyRuleIds.length))
                conditional = false;
            if (evaluatedCells.length && evaluatedCells.every(c => c.allowed) && !conditional) {
                effect = "allow";
                reasonCode = "ALLOW";
            }
            else if (evaluatedCells.some(c => c.denyRuleIds.length))
                reasonCode = "EXPLICIT_DENY";
            else if (conditional)
                reasonCode = "CONDITIONAL_EVALUATION_REQUIRED";
        }
        catch (error) {
            reasonCode = error instanceof Error && publicFaultCodes.has(error.message) ? error.message : "AUTHORITY_UNAVAILABLE";
            conditional = false;
            evaluatedCells.length = 0;
            provenance.length = 0;
        }
        const safeStamp = stamp ?? { authorityId: request?.resource?.authorityId ?? "unknown", policyRevision: "unknown", principalRevision: "unknown", sessionRevision: "unknown", resourceRevision: "unknown", factRevision: "unknown", evaluatedAt: now.toISOString(), expiresAt: now.toISOString() };
        const decision = { contractVersion: 2, decisionId: randomUUID(), requestDigest: digest, stamp: safeStamp, effect, reasonCode, conditional, provenance: fullExplanation ? provenance.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : [], evaluatedCells: fullExplanation ? evaluatedCells : evaluatedCells.map(({ recordIndex, fieldId, allowed }) => ({ recordIndex, fieldId, allowed, allowRuleIds: [], denyRuleIds: [] })) };
        this.issued.set(decision, canonicalChecksum(decision));
        if (fullExplanation)
            this.plannerFacts.set(decision, new Map(plannerFacts));
        return decision;
    }
    authorize(request) { return this.evaluate(request, false); }
    async can(request) { const d = await this.authorize(request); return { allowed: d.effect === "allow", conditional: d.conditional, decisionId: d.decisionId }; }
    async canAny(requests) {
        if (!Array.isArray(requests) || !requests.length)
            return { allowed: false, conditional: false, decisionIds: [] };
        const results = await Promise.all(requests.map(request => this.authorize(request)));
        return { allowed: results.some(x => x.effect === "allow"), conditional: results.some(x => x.conditional), decisionIds: results.map(x => x.decisionId) };
    }
    async explain(request, audience) {
        try {
            const identity = await this.dep.identity.verify(request.context);
            await this.dep.identity.verify(audience);
            if (!this.dep.explanations || !await this.dep.explanations.mayExplain(audience, identity.principal, request.resource))
                throw new Error("EXPLANATION_FORBIDDEN");
            return this.evaluate(request, true);
        }
        catch {
            return this.authorize(request);
        }
    }
    /** A probe/decision is never a bearer grant. Reattest the exact request and re-evaluate. */
    async assertCurrent(decision, request) {
        if (this.issued.get(decision) !== canonicalChecksum(decision) || decision.effect !== "allow" || this.clock().getTime() >= Date.parse(decision.stamp.expiresAt))
            throw new Error("DECISION_STALE");
        const current = await this.authorize(request);
        if (current.effect !== "allow" || current.requestDigest !== decision.requestDigest ||
            current.stamp.policyRevision !== decision.stamp.policyRevision || current.stamp.principalRevision !== decision.stamp.principalRevision ||
            current.stamp.sessionRevision !== decision.stamp.sessionRevision || current.stamp.resourceRevision !== decision.stamp.resourceRevision ||
            current.stamp.factRevision !== decision.stamp.factRevision)
            throw new Error("DECISION_STALE");
    }
    /** The trusted WP4 planner can recheck conditional evidence before DOE uses a plan. */
    async assertPlannerCurrent(decision, request, capability) {
        const checks = [];
        const safeStamp = (stamp) => ({ ...stamp, sessionRevision: canonicalChecksum(stamp.sessionRevision) });
        const emit = (phase, current) => { const trace = globalThis[Symbol.for('stage5.plannerTrace')]; trace?.({ phase, decisionId: decision.decisionId, checks, issuedStamp: safeStamp(decision.stamp), ...(current ? { currentStamp: safeStamp(current.stamp), issuedEffect: decision.effect, currentEffect: current.effect, issuedReason: decision.reasonCode, currentReason: current.reasonCode, issuedConditional: decision.conditional, currentConditional: current.conditional } : {}) }); };
        const check = (name, actual, expected) => { const failed = actual !== expected; checks.push({ name, actual: name === 'current.sessionRevision' ? canonicalChecksum(actual) : actual, expected: name === 'current.sessionRevision' ? canonicalChecksum(expected) : expected, failed }); return failed; };
        const expired = () => { const nowMs = this.clock().getTime(), expiresMs = Date.parse(decision.stamp.expiresAt); const failed = nowMs >= expiresMs; checks.push({ name: 'issued.expiry', nowMs, expiresMs, ageMs: nowMs - Date.parse(decision.stamp.evaluatedAt), failed }); return failed; };
        if (check('capability.configured', !!this.dep.plannerCapability, true) || check('capability.same', capability === this.dep.plannerCapability, true) ||
            check('issued.checksum', this.issued.get(decision), canonicalChecksum(decision)) || expired()) {
            emit('initial-reject');
            throw new Error('PLAN_EVIDENCE_STALE');
        }
        const current = await this.planEvidence(request, capability);
        if (check('current.requestDigest', current.requestDigest, decision.requestDigest) || check('current.effect', current.effect, decision.effect) || check('current.conditional', current.conditional, decision.conditional) ||
            check('current.policyRevision', current.stamp.policyRevision, decision.stamp.policyRevision) || check('current.principalRevision', current.stamp.principalRevision, decision.stamp.principalRevision) ||
            check('current.sessionRevision', current.stamp.sessionRevision, decision.stamp.sessionRevision) || check('current.resourceRevision', current.stamp.resourceRevision, decision.stamp.resourceRevision) ||
            check('current.factRevision', current.stamp.factRevision, decision.stamp.factRevision) || check('current.evaluatedCells', canonicalChecksum(current.evaluatedCells), canonicalChecksum(decision.evaluatedCells)) ||
            check('current.provenance', canonicalChecksum(current.provenance), canonicalChecksum(decision.provenance))) {
            emit('current-reject', current);
            throw new Error('PLAN_EVIDENCE_STALE');
        }
        // Only compact aggregate success evidence; full comparison evidence is emitted on rejection.
        const trace = globalThis[Symbol.for('stage5.plannerTrace')];
        trace?.({ phase: 'allow', decisionId: decision.decisionId, checked: checks.length });
    }
}
//# sourceMappingURL=evaluator.js.map