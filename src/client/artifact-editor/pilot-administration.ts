import { pilot, pilotGrantChanges, type PilotStatus } from '../../shared/pilot-administration.js';

export type PilotRequest = (action: 'pilot-status' | 'onboarding' | 'stage' | 'activate', body?: unknown) => Promise<any>;
type Candidate = { id: string; checksum: string; baseRevision: number; activatable: boolean };
export class PilotAdministration {
  status?: PilotStatus;
  candidate?: Candidate;
  review?: { reason: string; cleanup: boolean; changes: ReturnType<typeof pilotGrantChanges> };
  constructor(private readonly request: PilotRequest) {}
  invalidate() { this.status = undefined; this.candidate = undefined; this.review = undefined; }
  async refresh() {
    this.invalidate();
    const value = await this.request('pilot-status') as PilotStatus;
    if (value.applicationId !== pilot.applicationId || value.applicationKey !== pilot.key || value.principalId !== pilot.securityAdmin ||
      value.deploymentId !== pilot.deploymentId || value.authorityId !== pilot.authorityId || !Number.isInteger(value.revision)) throw new Error('Pilot identity or authority mismatch.');
    this.status = value; return value;
  }
  private reason(value: string) { if (!value.trim()) throw new Error('A nonempty reason is required.'); return value.trim(); }
  async provision(reason: string) {
    reason = this.reason(reason);
    const state = await this.refresh();
    if (state.anchor) throw new Error('An administrator anchor already exists. No provisioning request sent.');
    const result = await this.request('onboarding', { administratorUserId: pilot.administrator, reason });
    if (result.status !== 'activated') throw new Error('Initial provisioning was not activated. Stop and review the refusal.');
    this.invalidate();
    return 'Initial provisioning activated. Refresh state to verify the administrator anchor; Application reads are a separate check.';
  }
  async stage(reason: string, cleanup: boolean) {
    reason = this.reason(reason);
    const state = await this.refresh();
    if (state.anchor?.userId !== pilot.administrator) throw new Error('The approved administrator anchor must be verified before staging.');
    const changes = pilotGrantChanges(cleanup);
    const value = await this.request('stage', { changes, expectedRevision: state.revision, reason });
    if (!value.activatable || typeof value.id !== 'string' || typeof value.checksum !== 'string' || value.baseRevision !== state.revision) {
      const codes = Array.isArray(value.diagnostics) ? value.diagnostics.map((d: { code?: unknown }) => d.code)
        .filter((code: unknown): code is string => typeof code === 'string' && /^[A-Za-z0-9_.-]{1,100}$/.test(code)).join(', ') : '';
      throw new Error(`Candidate refused or stale${codes ? ` (${codes})` : ''}. No activation is available.`);
    }
    this.candidate = { id: value.id, checksum: value.checksum, baseRevision: value.baseRevision, activatable: true };
    this.review = { reason, cleanup, changes }; return { candidate: this.candidate, plan: this.review };
  }
  async activate(reason: string, cleanup: boolean, reviewed: boolean) {
    if (!reviewed || !this.candidate || !this.review || this.reason(reason) !== this.review.reason || cleanup !== this.review.cleanup) throw new Error('Review the staged candidate and unchanged plan before activation.');
    const candidate = this.candidate;
    // Invalidate first: a failed/ambiguous activation is never silently retried.
    this.candidate = undefined; this.review = undefined;
    const value = await this.request('pilot-status') as PilotStatus;
    if (value.applicationId !== pilot.applicationId || value.applicationKey !== pilot.key || value.deploymentId !== pilot.deploymentId || value.authorityId !== pilot.authorityId || value.principalId !== pilot.securityAdmin || value.revision !== candidate.baseRevision || value.anchor?.userId !== pilot.administrator) throw new Error('Pilot authority or policy revision changed. Restage and review.');
    const result = await this.request('activate', { candidateId: candidate.id, checksum: candidate.checksum, expectedRevision: candidate.baseRevision, reason: reason.trim() });
    if (result.status !== 'activated') throw new Error('Candidate activation refused. Stop and review.');
    this.invalidate(); return 'Functional permissions activated. Refresh state and verify audit; Application authoring access is a separate check.';
  }
}

export function mountPilotAdministration(container: HTMLElement, request: PilotRequest) {
  const model = new PilotAdministration(request);
  const open = document.createElement('button'); open.type = 'button'; open.textContent = 'Inspect disposable pilot administration';
  const panel = document.createElement('section'); panel.hidden = true;
  const title = document.createElement('h2'); title.textContent = 'Disposable pilot administration';
  const identity = document.createElement('p'); identity.textContent = `${pilot.key} · ${pilot.applicationId}`;
  const admin = document.createElement('select'); admin.setAttribute('aria-label', 'Initial pilot administrator');
  admin.add(new Option(`Application Admin · ${pilot.administrator}`, pilot.administrator));
  const reasonLabel = document.createElement('label'); reasonLabel.textContent = 'Reason ';
  const reason = document.createElement('input'); reason.type = 'text'; reason.required = true; reasonLabel.append(reason);
  const cleanupLabel = document.createElement('label'); const cleanup = document.createElement('input'); cleanup.type = 'checkbox';
  cleanupLabel.append(cleanup, ' Include ui.page.admin only for necessary disposable placeholder cleanup');
  const reviewLabel = document.createElement('label'); const reviewed = document.createElement('input'); reviewed.type = 'checkbox';
  reviewLabel.append(reviewed, ' I reviewed this exact candidate, permissions, scopes and reason');
  const state = document.createElement('pre'); const plan = document.createElement('pre');
  for (const output of [state, plan]) { output.style.whiteSpace = 'pre-wrap'; output.style.overflowWrap = 'anywhere'; }
  const feedback = document.createElement('p'); feedback.setAttribute('role', 'status');
  const button = (text: string) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; return b; };
  const refresh = button('Refresh provisioning state'), provision = button('Provision initial administrator'), stage = button('Stage functional permissions'), activate = button('Activate reviewed candidate');
  const mutations = [provision, stage, activate];
  const sync = () => { provision.disabled = !model.status || !!model.status.anchor || !reason.value.trim(); stage.disabled = model.status?.anchor?.userId !== pilot.administrator || !reason.value.trim();
    activate.disabled = !model.candidate || !reviewed.checked || model.review?.reason !== reason.value.trim() || model.review?.cleanup !== cleanup.checked; };
  let generation = 0;
  const run = async (action: () => Promise<unknown>) => {
    const started = generation; [open, refresh, ...mutations].forEach(b => b.disabled = true);
    reason.disabled = cleanup.disabled = reviewed.disabled = true;
    try { const result = await action(); if (started !== generation) return;
      feedback.textContent = typeof result === 'string' ? result : 'State read successfully; no provisioning or activation performed by this read.';
      state.textContent = model.status ? JSON.stringify(model.status, null, 2) : 'Refresh state to verify the result.';
      plan.textContent = model.candidate ? JSON.stringify({ candidate: model.candidate, plan: model.review }, null, 2) : '';
    } catch (error) { if (started !== generation) return; model.invalidate(); panel.hidden = true; state.textContent = ''; plan.textContent = ''; feedback.textContent = `Refused/unavailable: ${error instanceof Error ? error.message : 'Request failed.'} No success is inferred.`; }
    finally { if (started === generation) { open.disabled = refresh.disabled = false; reason.disabled = cleanup.disabled = reviewed.disabled = false; sync(); } }
  };
  open.onclick = () => { panel.hidden = true; void run(async () => { const value = await model.refresh(); panel.hidden = false; return value; }); };
  refresh.onclick = () => { reviewed.checked = false; void run(() => model.refresh()); };
  provision.onclick = () => { void run(() => model.provision(reason.value)); };
  stage.onclick = () => { reviewed.checked = false; void run(async () => { await model.stage(reason.value, cleanup.checked); return 'Candidate staged, not activated. Review its exact identity, permissions, scopes and reason below.'; }); };
  activate.onclick = () => { void run(() => model.activate(reason.value, cleanup.checked, reviewed.checked)); };
  reason.oninput = cleanup.onchange = reviewed.onchange = sync;
  panel.append(title, identity, admin, reasonLabel, cleanupLabel, refresh, state, provision, stage, plan, reviewLabel, activate);
  container.append(open, panel, feedback); sync();
  return () => { generation++; model.invalidate(); panel.hidden = true; state.textContent = plan.textContent = feedback.textContent = ''; reviewed.checked = false;
    open.disabled = refresh.disabled = false; reason.disabled = cleanup.disabled = reviewed.disabled = false; sync(); };
}
