import { workspaceIdentityKey, type WorkspaceIdentity } from '../shared/builder-workspace.js';
import type { ApplicationDiagnostic, ApplicationValidationReport, ValidationDependency } from '../shared/application-diagnostics.js';

export interface CapturedValidationSource {
  identity: WorkspaceIdentity; revision: string; subsystem: string;
  /** Capture must include outgoing references, even when the source is invalid.
   * Omit neither an unresolved dependency nor an unavailable validator silently. */
  validate(): Promise<{ diagnostics: ApplicationDiagnostic[]; dependencies: WorkspaceIdentity[]; complete: boolean }>;
}
export interface ValidationAdmission {
  /** Existing owner/identity service checks, before reads and before returning.
   * Throw on identity/policy changes: no previously read diagnostics may escape. */
  assertAuthority(): Promise<void>;
  canRead(identity: WorkspaceIdentity): Promise<boolean>;
  /** Recheck the entire captured revision set, including dependency discovery. */
  revisionsCurrent(): Promise<boolean>;
}

/** Read-only foundation. Capture adapters are trusted server contributions, never
 * request-supplied validators or authorization decisions. No writes or grants. */
export async function validateCapturedApplication(sources: CapturedValidationSource[], roots: WorkspaceIdentity[], admission: ValidationAdmission): Promise<ApplicationValidationReport> {
  await admission.assertAuthority();
  const diagnostics: ApplicationDiagnostic[] = [], edges: ValidationDependency[] = [];
  const captured = new Map<string, CapturedValidationSource>();
  const incomplete = new Set<string>();
  let undisclosed = false;
  for (const source of sources) {
    // Do not return denied identity, revision, exception message or path.
    if (!await admission.canRead(source.identity)) { undisclosed = true; continue; }
    const key = workspaceIdentityKey(source.identity);
    if (captured.has(key)) {
      incomplete.add(key);
      diagnostics.push({ severity: 'error', code: 'application.identity-ambiguous', message: 'Source identity is ambiguous. Resolve the duplicate before validation.', subsystem: 'application', target: { identity: source.identity }, revision: source.revision });
      continue;
    }
    captured.set(key, source);
    if (!source.revision) {
      incomplete.add(key);
      diagnostics.push({ severity: 'error', code: 'application.revision-unavailable', message: 'Source revision is unavailable. Capture its authoritative saved revision before validation.', subsystem: source.subsystem, target: { identity: source.identity } });
    }
    try {
      const result = await source.validate();
      // Native adapters may supply a more precise target, but never an unreadable owner.
      for (const d of result.diagnostics) {
        if (d.target && !await admission.canRead(d.target.identity)) { undisclosed = true; incomplete.add(key); continue; }
        diagnostics.push({ ...d, subsystem: source.subsystem, revision: d.revision ?? source.revision, target: d.target ?? { identity: source.identity } });
      }
      edges.push(...result.dependencies.map(to => ({ from: source.identity, to })));
      if (!result.complete) {
        incomplete.add(key);
        diagnostics.push({ severity: 'error', code: 'application.source-incomplete', message: 'This source has unresolved references or unavailable validation. Resolve them before publishing its consumers.', subsystem: source.subsystem, revision: source.revision, target: { identity: source.identity } });
      }
    } catch {
      incomplete.add(key);
      diagnostics.push({ severity: 'error', code: 'application.validation-unavailable', message: 'Source could not be completely validated. Retry the read or repair it in its owning editor.', subsystem: source.subsystem, revision: source.revision, target: { identity: source.identity } });
    }
  }
  const reachable = new Set<string>();
  const follow = (identity: WorkspaceIdentity) => {
    const key = workspaceIdentityKey(identity);
    if (reachable.has(key)) return;
    reachable.add(key);
    if (!captured.has(key)) return;
    for (const edge of edges) if (workspaceIdentityKey(edge.from) === key) follow(edge.to);
  };
  roots.forEach(follow);
  // Missing dependencies are diagnosed at their readable consumer; missing roots
  // and denied sources use an opaque Application-level result.
  for (const edge of edges) if (!captured.has(workspaceIdentityKey(edge.to))) {
    const key = workspaceIdentityKey(edge.from); incomplete.add(key);
    const source = captured.get(key)!;
    diagnostics.push({ severity: 'error', code: 'application.dependency-unavailable', message: 'A dependency is missing or unavailable. Resolve its reference and access through the owning editor.', subsystem: source.subsystem, revision: source.revision, target: { identity: source.identity } });
  }
  const missingRoot = !roots.length || roots.some(root => !captured.has(workspaceIdentityKey(root)));
  if (undisclosed || missingRoot) diagnostics.push({ severity: missingRoot ? 'error' : 'warning', code: 'application.validation-incomplete', message: 'Validation is incomplete because source or access is unavailable.', subsystem: 'application' });
  await admission.assertAuthority();
  if (!await admission.revisionsCurrent()) return { status: 'stale', diagnostics: [], reachable: [], blockers: [], publishable: false };
  await admission.assertAuthority();
  const blockers = diagnostics.filter(d => d.severity === 'error' && (!d.target || reachable.has(workspaceIdentityKey(d.target.identity))));
  const releaseIncomplete = missingRoot || [...incomplete].some(key => reachable.has(key));
  return {
    status: undisclosed || missingRoot || incomplete.size ? 'incomplete' : 'complete', diagnostics,
    // Unavailable/denied target identities must not cross the boundary.
    reachable: [...reachable].filter(key => captured.has(key)).sort(), blockers,
    publishable: !releaseIncomplete && blockers.length === 0,
  };
}
