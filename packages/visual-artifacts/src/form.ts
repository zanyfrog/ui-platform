import type { ArtifactFiles, ArtifactMetadata, DatasetDefinition, FormField, NodeOverride } from './model.js';
import { escapeAttribute } from './source.js';
import { valueErrors } from './model.js';
import type { CalculatedField, ScalarType } from '@ui-platform/dataset-operations/expression';
export function formCalculations(metadata: ArtifactMetadata): CalculatedField[] { return (metadata.form?.fields ?? []).flatMap(f => f.calculation ? [{ fieldId: f.datasetFieldId, type: f.type as ScalarType, ...f.calculation }] : []); }
export function formExpressionFields(metadata: ArtifactMetadata) { return (metadata.form?.fields ?? []).map(f => ({ fieldId: f.datasetFieldId, key: f.key, type: f.type, required: !!f.datasetRequired })); }

/** Modes override nodes, never own a second tree. Unknown selections fail closed. */
export function resolveMode(metadata: ArtifactMetadata, selected?: unknown): Record<string, NodeOverride> {
  const modes = metadata.modes;
  if (!modes) return {};
  const name = selected === undefined ? modes.default : String(selected);
  if (!Object.hasOwn(modes.overrides, name)) throw new Error(`Unknown mode: ${name}.`);
  const result = structuredClone(modes.overrides[modes.default]);
  for (const [node, override] of Object.entries(modes.overrides[name])) result[node] = { ...result[node], ...override };
  return result;
}
export function effectiveField(field: FormField, overrides: Record<string, NodeOverride>, operation: string, readOnly = false, authorization?: { read?: boolean; write?: boolean }): FormField {
  const result = { ...field, ...overrides[field.node] };
  result.visible = result.visible !== false && (!field.operations || field.operations.includes(operation as 'create' | 'edit')) && authorization?.read !== false;
  result.editable = result.editable !== false && !readOnly && authorization?.write !== false;
  result.required = field.datasetRequired || result.required;
  return result;
}
/** UI state and write payloads deliberately have separate lifecycles. */
export function formPayload(metadata: ArtifactMetadata, values: Record<string, unknown>, original: Record<string, unknown>, fields: FormField[], operation: string): Record<string, unknown> {
  const form = metadata.form!;
  if (!['create', 'edit'].includes(operation)) throw new Error('Unknown Form operation.');
  const record: Record<string, unknown> = {};
  if (operation === 'edit') {
    if (original[form.primaryKey] === undefined) throw new Error('Edit requires a record identity.');
    record[form.primaryKey] = original[form.primaryKey];
  }
  for (const field of fields) {
    if ((!field.editable && !field.calculation?.persist) || field.calculation && !field.calculation.persist || field.visible === false || field.key === form.primaryKey && operation === 'edit') continue;
    if (operation === 'create' || JSON.stringify(values[field.key]) !== JSON.stringify(original[field.key])) {
      if (values[field.key] !== undefined) record[field.key] = values[field.key];
    }
  }
  return record;
}
export function formValueErrors(values: Record<string, unknown>, fields: FormField[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field.key];
    const required = field.datasetRequired || field.required;
    const issues = valueErrors(value, { type: field.type, required }, field.label ?? field.key);
    if (field.codec === 'date' && value !== undefined) { let valid = false; try { valid = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && new Date(value).toISOString() === value; } catch { /* Invalid dates remain validation errors. */ } if (!valid) issues.push(`${field.label ?? field.key} requires a UTC ISO timestamp.`); }
    if (required && value === '') issues.push(`${field.label ?? field.key} is required.`);
    if (issues.length) errors[field.id] = issues.join(' ');
  }
  return errors;
}
/** Generated files enter the ordinary VisualArtifactService; no Form repository. */
export function generateForm(metadata: ArtifactMetadata, dataset?: DatasetDefinition): ArtifactFiles {
  if (metadata.kind !== 'component') throw new Error('Forms must be Platform Components.');
  if (dataset && (!dataset.dataset?.id || !Array.isArray(dataset.fields) || dataset.fields.some(f => !/^[A-Za-z][\w]*$/.test(f.key) || !f.id))) throw new Error('Import a published Dataset schema with stable field IDs.');
  const fields: FormField[] = (dataset?.fields ?? []).filter(f => ['string', 'number', 'integer', 'boolean', 'date'].includes(f.type)).map(f => ({
    id: `field_${f.id}`, node: `control_${f.key}`, key: f.key, datasetFieldId: f.id,
    type: f.type === 'number' || f.type === 'integer' ? 'number' : f.type === 'boolean' ? 'boolean' : 'string',
    datasetRequired: f.required, required: f.required, label: f.key, default: f.default, visible: true, editable: true,
    ...(f.type === 'date' ? { codec: 'date' as const, help: 'UTC timestamp, e.g. 2026-01-01T00:00:00.000Z. No date/time conversion is performed.' } : {}),
  }));
  metadata.capabilities = ['visual', 'form'];
  metadata.modes = { default: 'public', overrides: { public: {} } };
  metadata.form = { node: 'form', datasetId: dataset?.dataset.id ?? '', primaryKey: dataset?.fields.find(f => f.type === 'id')?.key ?? 'id', fields, submit: { service: 'dataset.write', readService: 'dataset.read' } };
  metadata.public = { properties: {
    mode: { type: 'string', default: 'public' }, operation: { type: 'string', enum: ['create', 'edit'], default: 'create' },
    recordId: { type: 'string' }, initialRecord: { type: 'object' }, readOnly: { type: 'boolean', default: false }, disabled: { type: 'boolean', default: false },
  }, events: Object.fromEntries(['submitStarted', 'submitSucceeded', 'submitFailed', 'recordCreated', 'recordUpdated', 'cancelRequested'].map(name => [name, { payload: { result: { type: 'object' as const } } }])), slots: [] };
  metadata.state = { ...metadata.state, values: {}, dirty: false, submitting: false, submitted: false, submitError: null, validation: {}, savedRecord: null };
  const controls = fields.map(f => `<div class="uip-layout-item" data-uip-node="row_${f.key}"><${f.type === 'number' ? 'uib-forms-number' : f.type === 'boolean' ? 'uib-forms-checkbox' : f.key.toLowerCase().includes('email') ? 'uib-forms-email' : 'uib-forms-textbox'} data-uip-node="${f.node}" name="${f.key}" label="${escapeAttribute(f.label!)}"></${f.type === 'number' ? 'uib-forms-number' : f.type === 'boolean' ? 'uib-forms-checkbox' : f.key.toLowerCase().includes('email') ? 'uib-forms-email' : 'uib-forms-textbox'}><span data-uip-field-error="${escapeAttribute(f.id)}" role="alert"></span></div>`).join('\n');
  return { metadata: JSON.stringify(metadata, null, 2) + '\n', source: `<section class="uip-layout-item" data-uip-node="content"><h2 data-uip-node="heading">${escapeAttribute(dataset?.dataset.name ?? 'New')} form</h2><p data-uip-node="instructions">Complete the fields and submit to save.</p><uib-forms-form data-uip-node="form" label="${escapeAttribute(dataset?.dataset.name ?? 'New')} form">\n${controls}\n</uib-forms-form><p data-uip-node="submit-error" role="alert"></p><pre data-uip-node="saved-result"></pre></section>\n`, css: ':host{max-width:42rem} [hidden]{display:none!important} .uip-layout-item{margin-block:.75rem} [role=alert]{color:#a01818}\n', fixtures: '{}\n', code: 'export {};\n' };
}
