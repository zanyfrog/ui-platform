import type { ArtifactMetadata, FormField } from './model.js';
import { effectiveField, formPayload, formValueErrors, resolveMode, formCalculations, formExpressionFields } from './form.js';
import { calculateFields } from './expression.js';

export interface FormRuntimeOptions {
  services?: Record<string, (input: unknown) => unknown | Promise<unknown>>;
  fieldAuthorization?: Record<string, Record<string, { read?: boolean; write?: boolean }>>;
}
export function attachFormRuntime(metadata: ArtifactMetadata, root: ShadowRoot, state: Record<string, unknown>, options: FormRuntimeOptions, inputs: () => Record<string, unknown>, render: () => void, emit: (name: string, payload: Record<string, unknown>) => void) {
  const form = metadata.form!;
  let original: Record<string, unknown> = {}, identity = '', generation = 0, disposed = false, loading = false;
  const operation = () => String(inputs().operation ?? 'create');
  const fields = (): FormField[] => form.fields.map(field => { const effective = effectiveField(field, resolveMode(metadata, inputs().mode), operation(), Boolean(inputs().readOnly || inputs().disabled || state.submitting || loading), options.fieldAuthorization?.[form.datasetId]?.[field.key]); if (field.calculation) effective.editable = false; return effective; });
  const values = () => state.values as Record<string, unknown>;
  const notify = (name: string, result: Record<string, unknown>) => { if (metadata.public?.events[name]) emit(name, { result }); };
  const service = (name: string, input: unknown) => {
    const adapter = options.services?.[name];
    if (!adapter) throw new Error(`Missing Dataset adapter: ${name}.`);
    return adapter(input);
  };
  function initialize() {
    const next = JSON.stringify([operation(), inputs().recordId, inputs().initialRecord]);
    if (next === identity) return;
    identity = next; const current = ++generation;
    original = structuredClone((inputs().initialRecord ?? {}) as Record<string, unknown>);
    state.values = Object.fromEntries(fields().filter(f => f.default !== undefined).map(f => [f.key, structuredClone(f.default)]));
    for (const field of form.fields) if (field.type === 'boolean' && !Object.hasOwn(values(), field.key)) values()[field.key] = false;
    Object.assign(values(), original); state.dirty = false; state.submitting = false; state.submitted = false; state.submitError = null; state.validation = {}; state.savedRecord = null;
    state.conversionErrors = {}; state.rawJsonValues = {};
    loading = false;
    if (operation() === 'edit' && inputs().initialRecord === undefined && inputs().recordId !== undefined) {
      loading = true;
      void Promise.resolve().then(() => service(form.submit.readService, { datasetId: form.datasetId, where: { field: form.primaryKey, op: 'eq', value: inputs().recordId } })).then(result => {
        if (disposed || current !== generation) return;
        if (!Array.isArray(result) || !result[0]) throw new Error('Record was not found or read was denied.');
        original = structuredClone(result[0]); state.values = structuredClone(original); loading = false; render();
      }).catch(error => { if (!disposed && current === generation) { loading = false; state.submitError = String(error); render(); } });
    }
  }
  function paint() {
    initialize();
    for (const field of fields()) {
      const control = root.querySelector<HTMLElement>(`[data-uip-node="${field.node}"]`);
      if (!control) continue;
      control.hidden = field.visible === false;
      control.toggleAttribute('readonly', !field.editable); control.toggleAttribute('disabled', !field.editable);
      control.toggleAttribute('required', Boolean(field.required));
      if (field.label !== undefined) control.setAttribute('label', field.label);
      if (field.help !== undefined) control.setAttribute('help', field.help);
      const value = values()[field.key];
      const raw = (state.rawJsonValues as Record<string, string>)[field.id];
      if (raw !== undefined || value !== undefined) { control.setAttribute('value', raw ?? (field.codec === 'json' ? JSON.stringify(value) : String(value))); if (field.type === 'boolean') control.toggleAttribute('checked', Boolean(value)); }
      const error = root.querySelector(`[data-uip-field-error="${field.id}"]`);
      if (error) error.textContent = String((state.validation as Record<string, unknown>)?.[field.id] ?? '');
    }
    const error = root.querySelector('[data-uip-node="submit-error"]'); if (error) error.textContent = String(state.submitError ?? '');
    const saved = root.querySelector('[data-uip-node="saved-result"]'); if (saved) saved.textContent = state.savedRecord ? JSON.stringify(state.savedRecord, null, 2) : '';
  }
  const capture = (event: Event) => {
    const control = event.composedPath().find(node => node instanceof HTMLElement && node.hasAttribute('data-uip-node')) as HTMLElement | undefined;
    const field = fields().find(f => f.node === control?.dataset.uipNode);
    if (!field || !field.editable || field.visible === false) return;
    // The nested native checkbox input precedes UI Base's reflected checked state.
    if (field.type === 'boolean' && event.type !== 'uib-forms-checkbox-change') return;
    const input = control as unknown as { value: unknown; checked: boolean };
    let changed = false;
    try { const next = field.codec === 'json' ? JSON.parse(String(input.value)) : field.type === 'boolean' ? input.checked : field.type === 'number' && input.value !== '' ? Number(input.value) : input.value; changed = JSON.stringify(next) !== JSON.stringify(values()[field.key]) || Object.hasOwn(state.conversionErrors as object, field.id); values()[field.key] = next; delete (state.validation as Record<string, unknown>)[field.id]; }
    catch { const message = 'Enter valid JSON. The incomplete value has not been converted.'; (state.validation as Record<string, unknown>)[field.id] = message; (state.conversionErrors as Record<string, string>)[field.id] = message; (state.rawJsonValues as Record<string, string>)[field.id] = String(input.value); return; }
    delete (state.conversionErrors as Record<string, string>)[field.id]; delete (state.rawJsonValues as Record<string, string>)[field.id];
    if (!changed) return;
    state.dirty = true;
    if (field.type === 'boolean') { setTimeout(() => { if (!disposed) render(); }, 0); return; }
    const focus = event.composedPath()[0] as HTMLInputElement, start = focus.selectionStart, end = focus.selectionEnd;
    render();
    const replacement = root.querySelector<HTMLElement>(`[data-uip-node="${field.node}"]`);
    const target = replacement?.shadowRoot?.querySelector<HTMLInputElement>('input,textarea');
    if (target && !replacement?.hidden) { target.focus(); if (start !== null && end !== null && ['text', 'search', 'tel', 'url', 'password'].includes(target.type)) { try { target.setSelectionRange(start, end); } catch { /* Input type does not expose selection. */ } } }
  };
  const submit = async (event: Event) => {
    if (!(event.target instanceof HTMLElement) || event.target.dataset.uipNode !== form.node) return;
    event.stopPropagation();
    if (state.submitting || loading || inputs().disabled || inputs().readOnly) return;
    const current = generation;
    try {
      if (!form.datasetId) throw new Error('Map a connected Dataset before submitting.');
      if (state.calculationError || Object.keys(state.conversionErrors as object).length) throw new Error(String(state.calculationError ?? 'Correct invalid JSON before submitting.'));
      state.commitOutcome = undefined;
      // Conditions may remove a control or ancestor from the DOM. Retained values
      // still submit; only existing operation/read-only/host restrictions narrow writes.
      const active = fields();
      state.validation = formValueErrors(values(), active);
      if ((event as CustomEvent).detail?.valid === false || Object.keys(state.validation as object).length) throw new Error('Correct the validation errors before submitting.');
      const record = formPayload(metadata, values(), original, active, operation());
      if (operation() === 'create' && record[form.primaryKey] === undefined) record[form.primaryKey] = crypto.randomUUID();
      state.submitting = true; state.submitError = null; notify('submitStarted', {}); render();
      const result = await service(form.submit.service, { datasetId: form.datasetId, ...(form.contractVersion === 1 || formCalculations(metadata).some(c => c.persist) ? { formId: metadata.componentId } : {}), operation: operation() === 'edit' ? 'update' : 'insert', records: [record] }) as Record<string, unknown>;
      if (disposed || current !== generation) return;
      state.commitOutcome = result?.commitOutcome ?? (result?.committed ? 'committed' : 'not-committed');
      if (result?.success !== true || result.committed !== true) throw new Error(JSON.stringify(result));
      // Read after commit, rather than presenting a client-side echo as persisted data.
      const saved = await service(form.submit.readService, { datasetId: form.datasetId, where: { field: form.primaryKey, op: 'eq', value: record[form.primaryKey] } });
      if (disposed || current !== generation) return;
      if (!Array.isArray(saved) || !saved[0]) throw new Error('Write committed, but the saved record could not be read. Do not automatically repeat the submission.');
      original = structuredClone(saved[0]); state.values = structuredClone(original); state.savedRecord = structuredClone(original);
      state.dirty = false; state.submitted = true;
      notify('submitSucceeded', result);
      notify(operation() === 'edit' ? 'recordUpdated' : 'recordCreated', original);
    } catch (error) {
      if (!disposed && current === generation) { state.submitError = `${state.commitOutcome === 'committed' ? 'Write committed. Read-back or post-commit processing failed. ' : ''}${String(error)}`; notify('submitFailed', { message: String(error), commitOutcome: state.commitOutcome }); }
    } finally { if (!disposed && current === generation) { state.submitting = false; render(); } }
  };
  root.addEventListener('input', capture); root.addEventListener('change', capture);
  root.addEventListener('uib-forms-checkbox-change', capture);
  root.addEventListener('uib-forms-form-submit', submit);
  return { paint, prepare() {
    initialize();
    const calculations = formCalculations(metadata);
    for (const c of calculations) { const f = form.fields.find(f => f.datasetFieldId === c.fieldId)!; delete values()[f.key]; }
    try {
      if (calculations.some(c => options.fieldAuthorization?.[form.datasetId]?.[form.fields.find(f => f.datasetFieldId === c.fieldId)!.key]?.read === false)) throw new Error('Calculated field is unavailable.');
      const readable = Object.fromEntries(Object.entries(values()).filter(([key]) => options.fieldAuthorization?.[form.datasetId]?.[key]?.read !== false));
      Object.assign(values(), calculateFields(calculations, formExpressionFields(metadata), readable)); state.calculationError = undefined;
    } catch { state.calculationError = 'Calculated fields require valid, readable dependency values.'; }
  }, destroy() { disposed = true; generation++; root.removeEventListener('input', capture); root.removeEventListener('change', capture); root.removeEventListener('uib-forms-checkbox-change', capture); root.removeEventListener('uib-forms-form-submit', submit); } };
}
