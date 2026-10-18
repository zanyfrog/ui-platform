import { validateMenu, type PackageComponent, type RuntimeArtifact, type ArtifactBundle, type CompositionDefinition } from '@ui-platform/visual-artifacts';
import { capturedAutomationSource, capturedGenericSource, capturedVisualSource, compositionSourceDiagnostics, type NativeReference } from './application-diagnostic-adapters.js';
import { validateCapturedApplication, type CapturedValidationSource, type ValidationAdmission } from './application-diagnostics.js';
import { workspaceIdentityKey, type AuthorizedWorkspaceArtifact, type WorkspaceArtifact, type WorkspaceIdentity } from '../shared/builder-workspace.js';
import type { ApplicationDiagnostic, ProblemsReport } from '../shared/application-diagnostics.js';
import { validateCompositionStyle } from './application-composition.js';

type Result = Awaited<ReturnType<CapturedValidationSource['validate']>>;
/** Disposable per-authority validation cache over existing revision-qualified native references. */
export class ProblemsValidation {
  private previous = new Map<string, { revision: string; result: Result }>();
  private captureAvailability?: string;
  async validate(sources: CapturedValidationSource[], roots: WorkspaceIdentity[], admission: ValidationAdmission, full = false, captureAvailability = ''): Promise<ProblemsReport> {
    const keys = new Set(sources.map(s => workspaceIdentityKey(s.identity)));
    const changed = new Set(sources.filter(s => this.previous.get(workspaceIdentityKey(s.identity))?.revision !== s.revision).map(s => workspaceIdentityKey(s.identity)));
    for (const key of this.previous.keys()) if (!keys.has(key)) changed.add(key);
    const uncertain = full || !this.previous.size || captureAvailability !== this.captureAvailability || sources.some(s => !this.previous.has(workspaceIdentityKey(s.identity))) || [...this.previous.values()].some(v => !v.result.complete);
    for (let more = true; more;) {
      more = false;
      for (const [key, cached] of this.previous) if (!changed.has(key) && cached.result.dependencies.some(d => changed.has(workspaceIdentityKey(d)))) { changed.add(key); more = true; }
    }
    const next = new Map<string, { revision: string; result: Result }>(), validated: string[] = [];
    const revisions = new Map(sources.map(s => [workspaceIdentityKey(s.identity), s.revision]));
    const report = await validateCapturedApplication(sources.map(source => ({ ...source, validate: async () => {
      const key = workspaceIdentityKey(source.identity), cached = this.previous.get(key);
      const result = !uncertain && !changed.has(key) && cached ? structuredClone(cached.result) : await source.validate();
      if (uncertain || changed.has(key) || !cached) validated.push(key);
      for (const diagnostic of result.diagnostics) if (diagnostic.target) diagnostic.revision = revisions.get(workspaceIdentityKey(diagnostic.target.identity)) ?? source.revision;
      result.diagnostics = [...new Map(result.diagnostics.map(d => [JSON.stringify(d), d])).values()];
      next.set(key, { revision: source.revision, result: structuredClone(result) }); return result;
    } })), roots, admission);
    if (report.status !== 'stale') { this.previous = next; this.captureAvailability = captureAvailability; }
    return { ...report, source: 'authoritative-saved', revisions: report.status === 'stale' ? {} : Object.fromEntries([...next].map(([key, value]) => [key, value.revision])), validated, refresh: uncertain ? 'full' : 'incremental' };
  }
}

export interface ProblemsRecord { summary: WorkspaceArtifact; load(): Promise<Partial<AuthorizedWorkspaceArtifact>> }
export async function captureProblemSources(records: ProblemsRecord[], context: { pages: ArtifactBundle[]; shells: ArtifactBundle[]; components: ArtifactBundle[]; packages: PackageComponent[] }, composition?: CompositionDefinition | null) {
  const runtime = (b: ArtifactBundle): RuntimeArtifact | undefined => b.metadata ? { metadata: b.metadata, source: b.files.source, css: b.files.css } : undefined;
  const components = context.components.map(runtime).filter((a): a is RuntimeArtifact => !!a);
  const payloads = new Map<ProblemsRecord, Partial<AuthorizedWorkspaceArtifact>>();
  for (const record of records) { try { payloads.set(record, await record.load()); } catch {} }
  const compositionComplete = !!composition;
  // Capture independent native units even when the save/runtime loader fails early.
  // The owning composition collector remains the only composition rule authority.
  if (!composition) {
    const settingsSource = records.find(r => r.summary.kind === 'settings');
    try {
      const settings = JSON.parse(settingsSource ? payloads.get(settingsSource)?.source?.content ?? '' : '').presentation;
      if (settings && typeof settings === 'object' && settings.model === 'composition-v1') {
        const pages = context.pages.map(runtime).filter((a): a is RuntimeArtifact => !!a), shells = context.shells.map(runtime).filter((a): a is RuntimeArtifact => !!a);
        const menus: CompositionDefinition['menus'] = [];
        for (const record of records.filter(r => r.summary.kind === 'menu')) { try { const menu = JSON.parse(payloads.get(record)?.source?.content ?? ''); if (menu && typeof menu === 'object' && !Array.isArray(menu)) menus.push(menu); } catch {} }
        composition = { settings, pages, shells, menus, routes: pages.map(p => ({ routeId: p.metadata.routeId!, pageId: p.metadata.artifactId, path: p.metadata.route! })), siteCss: '' };
      }
    } catch {}
  }
  const resolve = (reference: NativeReference) => {
    const matches = records.filter(r => r.summary.identity.id === reference.id || r.summary.componentId === reference.id || r.summary.identity.format === 'package' && r.summary.locator === reference.id);
    return matches.length === 1 ? matches[0].summary.identity : undefined;
  };
  const sources: CapturedValidationSource[] = [];
  for (const record of records) {
    const { summary } = record, identity = summary.identity;
    try {
      const payload = payloads.get(record); if (!payload) throw new Error('Unavailable');
      if (payload.legacy) sources.push({ identity, revision: payload.legacy.page.hash, subsystem: 'legacy', async validate() { return { complete: false, dependencies: [], diagnostics: [{ severity: 'info', code: 'legacy.validation-unavailable', message: 'Legacy TypeScript Page source is read-only inspection. Full authoring validation is unavailable; use a supported Visual Page.', subsystem: 'legacy', target: { identity } }] }; } });
      else if (payload.package) sources.push({ identity, revision: identity.owner.revision ?? '', subsystem: 'package', async validate() { return { complete: !!identity.owner.revision, dependencies: [], diagnostics: (payload.package!.activationIssues ?? []).map(message => ({ severity: 'warning', code: 'package.activation', message, subsystem: 'package', target: { identity } })) }; } });
      else if (payload.generic) sources.push(capturedGenericSource(identity, payload.generic, resolve));
      else if (payload.automation) sources.push(capturedAutomationSource(identity, payload.automation, resolve));
      else if (identity.format === 'visual') {
        const bundle = [...context.pages, ...context.shells, ...context.components].find(b => b.locator === summary.locator && (b.metadata?.artifactId === identity.id || !identity.id));
        if (!bundle) throw new Error('Unavailable');
        const artifact = runtime(bundle);
        if (artifact) sources.push(capturedVisualSource(identity, bundle.hash, artifact, components, context.packages, bundle.diagnostics, resolve, bundle.files));
        else sources.push({ identity, revision: bundle.hash, subsystem: 'visual', async validate() { return { complete: false, dependencies: [], diagnostics: bundle.diagnostics.map(d => ({ severity: d.severity, code: 'visual.validation', message: d.message, subsystem: 'visual', target: { identity, ...(d.node ? { node: d.node } : {}) } })) }; } });
      } else if (payload.source) {
        const source = payload.source;
        sources.push({ identity, revision: source.hash, subsystem: 'composition', async validate() {
          const diagnostics: ApplicationDiagnostic[] = [], dependencies: WorkspaceIdentity[] = [];
          let complete = compositionComplete;
          try {
            if (summary.kind === 'menu') validateMenu(JSON.parse(source.content));
            else if (summary.kind === 'style') await validateCompositionStyle(source.content);
            else if (summary.kind === 'settings') {
              const settings = JSON.parse(source.content);
              if (settings.presentation?.model === 'composition-v1') {
                if (composition) {
                  diagnostics.push(...compositionSourceDiagnostics(identity, composition, components, context.packages, (_kind, id) => resolve({ kind: 'artifact', id })));
                  dependencies.push(...records.filter(r => r.summary.identity.format === 'visual' || r.summary.kind === 'menu' || r.summary.kind === 'style').map(r => r.summary.identity));
                }
              } else { complete = false; diagnostics.push({ severity: 'info', code: 'composition.not-configured', message: 'Application composition is not configured; complete composition validation is unavailable.', subsystem: 'composition', target: { identity } }); }
            }
          } catch (error) { complete = false; diagnostics.push({ severity: 'error', code: summary.kind === 'menu' ? 'composition.menu' : summary.kind === 'style' ? 'composition.style' : 'composition.settings', message: error instanceof SyntaxError ? 'Invalid JSON.' : error instanceof Error ? error.message : 'Invalid source.', subsystem: 'composition', target: { identity } }); }
          return { diagnostics, dependencies, complete };
        } });
      }
    } catch {
      sources.push({ identity, revision: '', subsystem: summary.kind, async validate() { throw new Error('Unavailable'); } });
    }
  }
  return sources;
}
