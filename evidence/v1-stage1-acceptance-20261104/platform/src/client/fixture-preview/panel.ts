import { PreviewLifecycle, identityKey, type PreviewIdentity } from './lifecycle.js';
import { FixtureHost, fixtureCaptureId } from './host.js';
import { defaultSample, defaultPanelSample, defaultRouteSample, sampleSummary, validateSample, unsupportedFixtures, type FixtureSample } from './samples.js';

/** This panel receives identity and dirty status only; it has no editor or persistence reference. */
export class FixturePreviewPanel {
  readonly element = document.createElement('section');
  private lifecycle?: PreviewLifecycle<FixtureSample>;
  private readonly host: FixtureHost;
  private dirty = false;
  private readonly status: HTMLElement;
  private readonly identity: HTMLElement;
  private readonly capture: HTMLElement;
  private readonly view: HTMLElement;
  private readonly sample: HTMLTextAreaElement;
  private readonly kind: HTMLSelectElement;
  constructor() {
    this.element.setAttribute('aria-label', 'Fixture Preview');
    this.element.style.cssText = 'padding:16px;border:1px solid #aab8cc;border-radius:8px;margin-top:16px;overflow-wrap:anywhere';
    this.element.innerHTML = `<h3>Preview · Fixture demonstration</h3><p>Fixture mode · SAMPLE DATA · Saved-artifact Preview unavailable</p><p data-identity></p><p data-capture></p><p data-state role="status"></p><label>Sample type<select data-fixture><option value="card">Native Card</option><option value="panel">Native Panel layout fixture</option><option value="route">Synthetic route-parameter inspector</option></select></label><label>Synthetic sample (JSON)<textarea data-sample rows="8"></textarea></label><button type="button" data-refresh>Refresh fixture</button><button type="button" data-saved>Preview saved artifact</button><details><summary>Unsupported fixture contracts</summary><ul></ul></details><div data-view></div>`;
    const get = <T extends HTMLElement>(selector: string) => this.element.querySelector<T>(selector)!;
    this.status = get('[data-state]'); this.identity = get('[data-identity]'); this.capture = get('[data-capture]');
    this.view = get('[data-view]'); this.host = new FixtureHost(this.view); this.sample = get('[data-sample]');
    this.kind = get('[data-fixture]');
    this.kind.onchange = () => { this.invalidate('FIXTURE_KIND_CHANGED: explicit Refresh required'); this.sample.value = JSON.stringify(this.defaults(), null, 2); };
    this.sample.style.cssText = 'display:block;width:min(100%,640px);box-sizing:border-box;font-family:monospace';
    this.sample.value = JSON.stringify(defaultSample(), null, 2);
    this.sample.addEventListener('input', () => { this.invalidate('SAMPLE_CHANGED: explicit Refresh required'); });
    get('[data-refresh]').onclick = () => { void this.refresh(); };
    get('[data-saved]').onclick = () => { this.invalidate(unsupportedFixtures.saved); };
    for (const reason of Object.values(unsupportedFixtures)) { const item = document.createElement('li'); item.textContent = reason; get('ul').append(item); }
    this.present();
  }
  private defaults() { return this.kind.value === 'panel' ? defaultPanelSample() : this.kind.value === 'route' ? defaultRouteSample() : defaultSample(); }
  select(identity?: PreviewIdentity, dirty = false) {
    const previous = this.lifecycle?.snapshot;
    if (!identity || !previous || identityKey(previous.identity) !== identityKey(identity)) {
      this.host.clear(); this.lifecycle?.dispose(); this.lifecycle = identity ? new PreviewLifecycle(identity) : undefined;
      this.sample.value = identity ? JSON.stringify(this.defaults(), null, 2) : '';
    }
    this.dirty = dirty; this.present();
  }
  private present() {
    const state = this.lifecycle?.snapshot;
    this.sample.disabled = !state || state.state === 'revoked' || state.state === 'disposed';
    this.kind.disabled = this.sample.disabled;
    this.element.dataset.state = state?.state ?? 'empty';
    this.identity.textContent = state ? `Original selection · ${identityKey(state.identity)}` : 'Select an authorized artifact to identify this fixture session.';
    this.capture.textContent = state?.last ? `${state.last.provenance.kind === 'fixture' ? 'Fixture demonstration' : `Saved revision ${(state.last.provenance as { revision: string }).revision}`} · Capture ${state.last.captureId}${state.pending ? ` · Pending ${state.pending.requestId}` : ''}` : state?.pending ? `Pending ${state.pending.requestId} · No successful capture` : 'No successful capture';
    this.status.textContent = `${state?.state ?? 'empty'}${state?.reason ? ` · ${state.reason}` : ''}${this.dirty ? ' · Unsaved changes excluded; editor autosave remains independently governed.' : ''}`;
  }
  private retainedSummary() {
    const last = this.lifecycle?.snapshot.last;
    this.host.clear();
    if (last) {
      const summary = document.createElement('pre');
      summary.textContent = `STALE PREVIEW · SAMPLE DATA · Static sample summary (rendering destroyed)\n${sampleSummary(last.content)}`;
      summary.style.whiteSpace = 'pre-wrap';
      summary.inert = true; this.view.append(summary);
    }
  }
  invalidate(reason: string) { this.lifecycle?.invalidate(reason); this.retainedSummary(); this.present(); }
  revoke(reason = 'SIMULATED_REVOCATION') { this.lifecycle?.revoke(reason); this.host.clear(); this.sample.value = ''; this.present(); }
  dispose() { this.lifecycle?.dispose(); this.host.clear(); this.sample.value = ''; this.present(); }
  async refresh() {
    const lifecycle = this.lifecycle;
    if (!lifecycle || ['disposed', 'revoked'].includes(lifecycle.snapshot.state)) return;
    this.retainedSummary(); const request = lifecycle.refresh(); this.present();
    try {
      if (this.sample.value.length > 4096) throw new Error('SAMPLE_INPUT_LIMIT_EXCEEDED');
      const sample = validateSample(JSON.parse(this.sample.value));
      const captureId = await fixtureCaptureId(sample);
      if (this.lifecycle !== lifecycle || lifecycle.snapshot.pending?.sequence !== request.sequence) return;
      await this.host.render(request.identity, request.sequence, sample);
      if (this.lifecycle !== lifecycle) return;
      if (lifecycle.succeed(request, { identity: request.identity, captureId, provenance: { kind: 'fixture', fixtureId: sample.fixture }, content: sample })) this.present();
    } catch (error) {
      if (this.lifecycle === lifecycle && lifecycle.fail(request, error instanceof Error ? error.message : 'FIXTURE_UNAVAILABLE')) { this.retainedSummary(); this.present(); }
    }
  }
}
