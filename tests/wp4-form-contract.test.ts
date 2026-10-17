import { expect, it } from 'vitest';
import { generateForm, formValueErrors, formCalculations, validateArtifact, effectiveField, formPayload } from '@ui-platform/visual-artifacts';
import { visualFormDto } from '../src/client/artifact-editor/visual-form-transport.js';
import { EditorWorkingCopy } from '../src/client/artifact-editor/working-copy.js';
import type { ArtifactMetadata } from '@ui-platform/visual-artifacts';
const metadata = (): ArtifactMetadata => ({ schemaVersion: 1, artifactId: 'art_test', componentId: 'cmp_platform_test', kind: 'component', name: 'test', displayName: 'Test' });
const schema = { dataset: { id: 'dataset', key: 'records', name: 'Records' }, fields: [{ id: 'id', key: 'id', type: 'id', required: true }, { id: 'name', key: 'name', type: 'string', required: true }, { id: 'when', key: 'when', type: 'date' }, { id: 'json', key: 'details', type: 'json', required: true }] };
it('submits retained presentation-hidden values on create and changed hidden values on edit', () => {
  const m = metadata(); generateForm(m, schema);
  const fields = m.form!.fields.map(f => effectiveField(f, { [f.node]: { visible: false } }, 'create'));
  const values = { name: 'Retained', when: '2026-10-16T12:34:56.000Z' };
  expect(formPayload(m, values, {}, fields, 'create')).toEqual(values);
  expect(formPayload(m, values, { id: 'one', name: 'Before', when: values.when }, fields, 'edit')).toEqual({ id: 'one', name: 'Retained' });
  expect(values).toEqual({ name: 'Retained', when: '2026-10-16T12:34:56.000Z' });
});
it.each(['read-denied', 'write-denied', 'host-readonly', 'operation-inapplicable', 'presentation-readonly'] as const)('visibility cannot override %s', restriction => {
  const m = metadata(); generateForm(m, schema); const field = m.form!.fields[0];
  if (restriction === 'operation-inapplicable') field.operations = ['edit'];
  const effective = effectiveField(field, { [field.node]: { visible: false, editable: restriction !== 'presentation-readonly' } }, 'create', restriction === 'host-readonly', restriction === 'read-denied' ? { read: false } : restriction === 'write-denied' ? { write: false } : undefined);
  expect(formPayload(m, { name: 'Retained' }, {}, [effective], 'create')).toEqual({});
});
it('includes hidden persisted calculations but excludes display-only calculations and host-denied calculated writes', () => {
  const m = metadata(); generateForm(m, schema); const field = m.form!.fields[0];
  field.editable = false; field.visible = false;
  field.calculation = { persist: true, expression: { version: 1, expression: { kind: 'literal', value: 'Computed' } } };
  const values = { name: 'Computed' };
  expect(formPayload(m, values, {}, [effectiveField(field, {}, 'create')], 'create')).toEqual(values);
  for (const authorization of [{ read: false }, { write: false }]) expect(formPayload(m, values, {}, [effectiveField(field, {}, 'create', false, authorization)], 'create')).toEqual({});
  expect(formPayload(m, values, {}, [effectiveField(field, {}, 'create', true)], 'create')).toEqual({});
  field.operations = ['edit']; expect(formPayload(m, values, {}, [effectiveField(field, {}, 'create')], 'create')).toEqual({});
  delete field.operations; field.calculation.persist = false;
  expect(formPayload(m, values, {}, [effectiveField(field, {}, 'create')], 'create')).toEqual({});
});
it('keeps required Dataset and type validation active for presentation-hidden fields', () => {
  const m = metadata(); generateForm(m, schema);
  const fields = m.form!.fields.map(f => effectiveField(f, { [f.node]: { visible: false, required: false } }, 'create'));
  expect(formValueErrors({ when: 'invalid' }, fields)).toHaveProperty(fields[0].id);
  expect(formValueErrors({ when: 'invalid' }, fields)).toHaveProperty(fields[1].id);
  expect(formValueErrors({ name: 'Retained', when: '2026-10-16T12:34:56.000Z' }, fields)).toEqual({});
});
it('projects the authoritative Visual roles without inventing a generic manifest or definition', () => {
  const m = metadata(), files = generateForm(m, schema), dto = visualFormDto({ locator: 'test/component.visual.json', metadata: m, files, hash: 'hash', diagnostics: [] }, true);
  expect(dto.manifest).toBeNull(); expect(dto.manifestContent).toBe(''); expect(dto.files.map(f => f.role)).toEqual(['source', 'css', 'metadata', 'fixtures', 'code']);
  expect(dto.visualForm?.componentId).toBe(m.componentId); expect(dto.files.find(f => f.role === 'metadata')?.content).toBe(files.metadata);
});
it('generates lossless date text controls and exposes unsupported JSON through the remaining Dataset fields', () => {
  const m = metadata(); generateForm(m, schema);
  expect(m.form?.fields.map(f => f.datasetFieldId)).toEqual(['name','when']);
  const date = m.form!.fields.find(f => f.key === 'when')!;
  expect(date.codec).toBe('date'); expect(formValueErrors({ when: '2026-10-16T12:34:56.000Z' }, [date])).toEqual({});
  expect(formValueErrors({ when: '2026-02-31T12:34:56.000Z' }, [date])).toHaveProperty(date.id);
  expect(formValueErrors({ when: '2026-10-16' }, [date])).toHaveProperty(date.id);
  expect(schema.fields.find(f => f.id === 'json')).toMatchObject({ type: 'json', required: true });
});
it('saves blank drafts but blocks invalid calculation graphs and Boolean conditions', () => {
  const m = metadata(), blank = generateForm(m); expect(validateArtifact({ metadata: m, source: blank.source, css: '' }).filter(d => d.severity === 'error')).toEqual([]);
  const mapped = generateForm(m, schema); m.form!.fields[0].calculation = { persist: true, expression: { version: 1, expression: { kind: 'field', fieldId: 'name' } } };
  expect(formCalculations(m)).toHaveLength(1); expect(validateArtifact({ metadata: m, source: mapped.source, css: '' }).some(d => d.message.includes('EXPRESSION_CYCLE'))).toBe(true);
  delete m.form!.fields[0].calculation; m.conditions = [{ node: m.form!.fields[0].node, when: { version: 1, expression: { kind: 'literal', value: 'wrong' } } }];
  expect(validateArtifact({ metadata: m, source: mapped.source, css: '' }).some(d => d.message.includes('Boolean'))).toBe(true);
});
it('keeps structural and mapping edits in one generic lifecycle command and coherent save', async () => {
  const m = metadata(), files = generateForm(m, schema), dto = visualFormDto({ locator: 'test/component.visual.json', metadata: m, files, hash: 'baseline', diagnostics: [] }, true);
  const saves: unknown[] = [];
  const copy = new EditorWorkingCopy(dto, { load: async () => dto, async save(_locator, changes) { saves.push(changes); return { saved: true, artifact: { ...copy.snapshot.artifact, checksum: 'saved' }, validation: dto.validation }; }, validateSaved: async () => dto.validation, getReferences: async () => dto.references });
  copy.setFiles({ 'component.html': files.source + '<!-- edit -->', 'component.visual.json': files.metadata + ' ' }, 'logical-structure');
  copy.undo(); expect(copy.snapshot.artifact.files.find(f => f.role === 'source')!.content).toBe(files.source);
  copy.redo(); await copy.flush(); expect(saves).toHaveLength(1); expect(Object.keys((saves[0] as { files: object }).files)).toHaveLength(2); await copy.discard();
});
