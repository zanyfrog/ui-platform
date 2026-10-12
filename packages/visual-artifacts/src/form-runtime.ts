import type { ArtifactMetadata, FormField } from './model.js';
import { effectiveField, formPayload, formValueErrors, resolveMode } from './form.js';

export interface FormRuntimeOptions {
  services?: Record<string, (input: unknown) => unknown | Promise<unknown>>;
  fieldAuthorization?: Record<string, Record<string, { read?: boolean; write?: boolean }>>;
}
export function attachFormRuntime(metadata: ArtifactMetadata, root: ShadowRoot, state: Record<string, unknown>, options: FormRuntimeOptions, inputs: () => Record<string, unknown>, render: () => void, emit: (name: string, payload: Record<string, unknown>) => void) {
  const form = metadata.form!;
  let original: Record<string, unknown> = {}, identity = '', generation = 0, disposed = false, loading = false;
  const operation = () => String(inputs().operation ?? 'create');
  const fields = (): FormField[] => form.fields.map(field => effectiveField(field, resolveMode(metadata, inputs().mode), operation(), Boolean(inputs().readOnly || inputs().disabled || state.submitting || loading), options.fieldAuthorization?.[form.datasetId]?.[field.key]));
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
    Object.assign(values(), original); state.dirty = false; state.submitting = false; state.submitted = false; state.submitError = null; state.validation = {}; state.savedRecord = null;
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
      if (value !== undefined) { control.setAttribute('value', String(value)); if (field.type === 'boolean') control.toggleAttribute('checked', Boolean(value)); }
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
    const input = control as unknown as { value: unknown; checked: boolean };
    values()[field.key] = field.type === 'boolean' ? input.checked : field.type === 'number' && input.value !== '' ? Number(input.value) : input.value;
    state.dirty = true;
  };
  const submit = async (event: Event) => {
    if (!(event.target instanceof HTMLElement) || event.target.dataset.uipNode !== form.node) return;
    event.stopPropagation();
    if (state.submitting || loading || inputs().disabled || inputs().readOnly) return;
    const current = generation;
    try {
      const active = fields().map(field => {
        const control = root.querySelector<HTMLElement>(`[data-uip-node="${field.node}"]`);
        return { ...field, visible: field.visible !== false && Boolean(control) && !control?.closest('[hidden]') };
      });
      state.validation = formValueErrors(values(), active);
      if ((event as CustomEvent).detail?.valid === false || Object.keys(state.validation as object).length) throw new Error('Correct the validation errors before submitting.');
      const record = formPayload(metadata, values(), original, active, operation());
      if (operation() === 'create' && record[form.primaryKey] === undefined) record[form.primaryKey] = crypto.randomUUID();
      state.submitting = true; state.submitError = null; notify('submitStarted', {}); render();
      const result = await service(form.submit.service, { datasetId: form.datasetId, operation: operation() === 'edit' ? 'update' : 'insert', records: [record] }) as Record<string, unknown>;
      if (disposed || current !== generation) return;
      if (result?.success !== true || result.committed !== true) throw new Error(JSON.stringify(result));
      // Read after commit, rather than presenting a client-side echo as persisted data.
      const saved = await service(form.submit.readService, { datasetId: form.datasetId, where: { field: form.primaryKey, op: 'eq', value: record[form.primaryKey] } });
      if (disposed || current !== generation) return;
      if (!Array.isArray(saved) || !saved[0]) throw new Error('Write committed, but the saved record could not be read.');
      original = structuredClone(saved[0]); state.values = structuredClone(original); state.savedRecord = structuredClone(original);
      state.dirty = false; state.submitted = true;
      notify('submitSucceeded', result);
      notify(operation() === 'edit' ? 'recordUpdated' : 'recordCreated', original);
    } catch (error) {
      if (!disposed && current === generation) { state.submitError = String(error); notify('submitFailed', { message: String(error) }); }
    } finally { if (!disposed && current === generation) { state.submitting = false; render(); } }
  };
  root.addEventListener('input', capture); root.addEventListener('change', capture);
  root.addEventListener('uib-forms-form-submit', submit);
  return { paint, destroy() { disposed = true; generation++; root.removeEventListener('input', capture); root.removeEventListener('change', capture); root.removeEventListener('uib-forms-form-submit', submit); } };
}
