import type { ArtifactValidationResult } from '@ui-platform/artifacts';
import { componentReferences, compositionDiagnostics, validateArtifact, type ArtifactFiles, type CompositionDefinition, type Diagnostic, type PackageComponent, type RuntimeArtifact } from '@ui-platform/visual-artifacts';
import { automationDependencies, type AutomationBundle } from '../shared/automation.js';
import type { ApplicationDiagnostic, AutomationServiceCatalogEntry } from '../shared/application-diagnostics.js';
import type { WorkspaceIdentity } from '../shared/builder-workspace.js';
import type { RegisteredAutomationService } from './automation-runtime.js';
import type { CapturedValidationSource } from './application-diagnostics.js';
import type { EditorArtifactDto } from '../shared/artifact-editor.js';
import { validateVisualRoleSyntax } from './visual-candidate.js';

/** Adapt already-authorized native results; never reimplement validation rules. */
export function genericDiagnostics(identity: WorkspaceIdentity, validation: ArtifactValidationResult): ApplicationDiagnostic[] {
  return validation.diagnostics.map(d => ({
    severity: d.severity, code: d.code, message: d.message, subsystem: 'generic',
    target: { identity, ...(d.field ? { field: d.field } : {}) },
    location: { file: d.file, path: d.path, line: d.line, column: d.column },
  }));
}
export function visualDiagnostics(identity: WorkspaceIdentity, artifact: RuntimeArtifact, components: RuntimeArtifact[], packages: PackageComponent[] = [], sourceDiagnostics: Diagnostic[] = []): ApplicationDiagnostic[] {
  return [...sourceDiagnostics, ...validateArtifact(artifact, components, packages)].map(d => ({
    severity: d.severity, code: 'visual.validation', message: d.message, subsystem: 'visual', target: { identity, ...(d.node ? { node: d.node } : {}) },
  }));
}
export function automationSourceDiagnostics(identity: WorkspaceIdentity, bundle: AutomationBundle): ApplicationDiagnostic[] {
  // The current native API has strings, not invented step locations or codes.
  return bundle.diagnostics.map(message => ({ severity: 'error', code: 'automation.validation', message: bundle.hash ? message : 'Automation source could not be read. Retry or repair it in its owning editor.', subsystem: 'automation', target: { identity } }));
}
export function compositionSourceDiagnostics(identity: WorkspaceIdentity, definition: CompositionDefinition, components: RuntimeArtifact[], packages: PackageComponent[], resolve: (kind: 'visual' | 'menu', id: string) => WorkspaceIdentity | undefined): ApplicationDiagnostic[] {
  return compositionDiagnostics(definition, components, packages).map(d => {
    const resolved = d.artifactId ? resolve('visual', d.artifactId) : d.menuId ? resolve('menu', d.menuId) : undefined;
    const precise = !!resolved || !d.artifactId && !d.menuId;
    return {
      severity: d.severity, code: d.code, message: d.message, subsystem: 'composition',
      target: { identity: resolved ?? identity,
        ...(precise && d.node ? { node: d.node } : {}), ...(precise && d.field ? { field: d.field } : {}) },
    };
  });
}
/** No approval is inferred from registration. Missing trusted signatures and
 * permissions remain a review prerequisite before WP5-C offers selection. */
export function registeredAutomationCatalog(services: ReadonlyMap<string, RegisteredAutomationService>): AutomationServiceCatalogEntry[] {
  return [...services].map(([id, service]) => ({ id, transactional: service.transactional, selection: 'contract-review-required' as const })).sort((a, b) => a.id.localeCompare(b.id));
}

export interface NativeReference { kind: 'artifact' | 'component' | 'dataset' | 'workflow' | 'service' | 'shell'; id: string }
/** Resolver must select an existing authorized owner-qualified identity. Unknown
 * identities remain incomplete; never guess a shared/Application owner. */
export function resolveDiagnosticReferences(identity: WorkspaceIdentity, references: NativeReference[], resolve: (reference: NativeReference) => WorkspaceIdentity | undefined) {
  const dependencies: WorkspaceIdentity[] = [], diagnostics: ApplicationDiagnostic[] = [];
  for (const reference of references) {
    const target = resolve(reference);
    if (target) dependencies.push(target);
    else diagnostics.push({ severity: 'error', code: 'application.reference-unresolved', message: 'A required reference cannot be resolved to an authorized source or approved service contract.', subsystem: 'application', target: { identity } });
  }
  return { dependencies, diagnostics, complete: diagnostics.length === 0 };
}
/** Native reference adapters: no unqualified ID map doubles as an authority. */
export function visualSourceReferences(artifact: RuntimeArtifact): NativeReference[] {
  const m = artifact.metadata;
  const actions = [...m.onLoad ?? [], ...(m.events ?? []).flatMap(event => event.actions)];
  return [
    ...componentReferences(artifact.source).map(id => ({ kind: 'component' as const, id })),
    ...(m.dependencies ?? []).map(id => ({ kind: 'artifact' as const, id })),
    ...(m.shellId ? [{ kind: 'shell' as const, id: m.shellId }] : []),
    ...(m.form ? [{ kind: 'dataset' as const, id: m.form.datasetId }, ...[m.form.submit.service, m.form.submit.readService].map(id => ({ kind: 'service' as const, id }))] : []),
    ...Object.values(m.sources ?? {}).flatMap(source => source.kind === 'service' && source.reference ? [{ kind: 'service' as const, id: source.reference }] : []),
    ...actions.flatMap<NativeReference>(action => action.kind === 'workflow' ? [{ kind: 'workflow', id: action.workflowId }] : action.kind === 'service' ? [{ kind: 'service', id: action.reference }] : []),
  ];
}
export function capturedAutomationSource(identity: WorkspaceIdentity, bundle: AutomationBundle, resolve: (reference: NativeReference) => WorkspaceIdentity | undefined): CapturedValidationSource {
  // Copy source evidence, not runtime executable service implementations.
  const captured = structuredClone(bundle), capturedIdentity = structuredClone(identity);
  return { identity: capturedIdentity, revision: captured.hash, subsystem: 'automation', async validate() {
    const definition = captured.definition;
    const refs: NativeReference[] = [];
    // Parsed JSON is not a typed definition until its native validation passes.
    // Keep native diagnostics rather than throwing while extracting malformed actions.
    if (definition && !captured.diagnostics.length) for (const id of automationDependencies(definition)) {
      const dataset = definition.datasetId === id || definition.actions.some(action => action.type === 'crud' && action.datasetId === id);
      const service = definition.actions.some(action => action.type === 'service' && action.service === id);
      if (dataset) refs.push({ id, kind: 'dataset' });
      if (service) refs.push({ id, kind: 'service' });
      if ((!dataset && !service) || definition.dependencies?.includes(id)) refs.push({ id, kind: 'artifact' });
    }
    const resolved = resolveDiagnosticReferences(capturedIdentity, refs, resolve);
    return { ...resolved, diagnostics: [...automationSourceDiagnostics(capturedIdentity, captured), ...resolved.diagnostics], complete: resolved.complete && !!definition && !!captured.hash && !captured.diagnostics.length };
  } };
}

export function capturedGenericSource(identity: WorkspaceIdentity, artifact: EditorArtifactDto, resolve: (reference: NativeReference) => WorkspaceIdentity | undefined): CapturedValidationSource {
  const captured = structuredClone(artifact), capturedIdentity = structuredClone(identity);
  return { identity: capturedIdentity, revision: captured.checksum, subsystem: 'generic', async validate() {
    const resolved = resolveDiagnosticReferences(capturedIdentity, captured.references.outgoing.map(reference => ({ kind: 'artifact', id: reference.artifactId })), resolve);
    return { ...resolved, diagnostics: [...genericDiagnostics(capturedIdentity, captured.validation), ...resolved.diagnostics] };
  } };
}

export function capturedVisualSource(identity: WorkspaceIdentity, revision: string, artifact: RuntimeArtifact, components: RuntimeArtifact[], packages: PackageComponent[], sourceDiagnostics: Diagnostic[], resolve: (reference: NativeReference) => WorkspaceIdentity | undefined, files: ArtifactFiles): CapturedValidationSource {
  // Capture source/metadata, never executable functions. Preview is a separate service.
  const capture = (item: RuntimeArtifact): RuntimeArtifact => ({ metadata: structuredClone(item.metadata), source: item.source, css: item.css });
  const captured = capture(artifact), related = components.map(capture), catalog = structuredClone(packages), parsed = structuredClone(sourceDiagnostics), capturedIdentity = structuredClone(identity), roles = structuredClone(files);
  return { identity: capturedIdentity, revision, subsystem: 'visual', async validate() {
    const diagnostics = visualDiagnostics(capturedIdentity, captured, related, catalog, parsed);
    let resolved: ReturnType<typeof resolveDiagnosticReferences>;
    try { resolved = resolveDiagnosticReferences(capturedIdentity, visualSourceReferences(captured), resolve); }
    catch { resolved = { dependencies: [], complete: false, diagnostics: [{ severity: 'error', code: 'application.references-incomplete', message: 'Repair invalid Visual metadata before its complete dependencies can be resolved.', subsystem: 'visual', target: { identity: capturedIdentity } }] }; }
    diagnostics.push(...resolved.diagnostics);
    try { await validateVisualRoleSyntax(roles); }
    catch (error) { diagnostics.push({ severity: 'error', code: 'visual.role-syntax', message: error instanceof Error ? error.message : 'Visual source syntax is invalid.', subsystem: 'visual', target: { identity: capturedIdentity } }); }
    return { ...resolved, diagnostics };
  } };
}
