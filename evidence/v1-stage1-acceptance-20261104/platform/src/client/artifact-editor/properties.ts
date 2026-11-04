import { ValidatorRegistry } from '@ui-platform/artifacts/validation';
import { EditorDescriptorRegistry, type EditorFieldDescriptor, type EditorSectionDescriptor } from '../../shared/editor-presentation.js';
import type { EditorRuntimeContext } from './context.js';
import { collectionItems, PropertyCompatibilityError, readProperty, writeProperty, type PropertyPath } from './property-bindings.js';

export interface FieldControlOptions {
  field: EditorFieldDescriptor; value: unknown; disabled: boolean;
  commit(value: unknown): void;
}
export type FieldControlFactory = (options: FieldControlOptions) => HTMLElement;
export class EditorFieldRegistry {
  private controls = new Map<string, FieldControlFactory>();
  register(id: string, factory: FieldControlFactory) {
    if (!id || this.controls.has(id)) throw new Error(`Field component already registered or unnamed: ${id}`);
    this.controls.set(id, factory);
  }
  get(id: string) { return this.controls.get(id); }
}
export const editorFields = new EditorFieldRegistry();
const textControl = (multiline = false, number = false): FieldControlFactory => ({ field, value, disabled, commit }) => {
  if (value !== undefined && typeof value !== 'string' && !(number && typeof value === 'number')) throw new PropertyCompatibilityError('unsupported', 'This value cannot be represented by this field. Source is preserved.');
  if (typeof value === 'number' && (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))) throw new PropertyCompatibilityError('unsupported', 'This number cannot be represented precisely by this control. Source is preserved.');
  const input = document.createElement(multiline ? 'textarea' : 'input');
  input.value = value === undefined ? '' : String(value); input.disabled = disabled; input.setAttribute('aria-label', field.label);
  if (number) input.inputMode = 'decimal';
  input.addEventListener('input', () => {
    const value = input.value;
    // Incomplete/invalid numeric drafts remain actual JSON string values, never NaN/null or a second source store.
    const numeric = Number(value);
    commit(number && /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value) && Number.isFinite(numeric) && (!Number.isInteger(numeric) || Number.isSafeInteger(numeric)) ? numeric : value);
  });
  return input;
};
editorFields.register('text', textControl()); editorFields.register('long-text', textControl(true)); editorFields.register('number', textControl(false, true));
editorFields.register('boolean', ({ field, value, disabled, commit }) => {
  if (value !== undefined && typeof value !== 'boolean') throw new PropertyCompatibilityError('unsupported', 'This Boolean value has an unsupported structure. Source is preserved.');
  const select = document.createElement('select'); select.setAttribute('aria-label', field.label); select.disabled = disabled;
  select.append(new Option('Not specified', ''), new Option('Yes', 'true'), new Option('No', 'false'));
  select.value = value === undefined ? '' : String(value);
  select.addEventListener('change', () => { if (select.value) commit(select.value === 'true'); }); return select;
});
editorFields.register('select', ({ field, value, disabled, commit }) => {
  if (value !== undefined && typeof value !== 'string') throw new PropertyCompatibilityError('unsupported', 'This selection has an unsupported structure. Source is preserved.');
  const select = document.createElement('select'); select.setAttribute('aria-label', field.label); select.disabled = disabled;
  select.append(new Option('Not specified', ''));
  for (const option of field.options ?? []) select.append(new Option(option.label, option.value));
  if (typeof value === 'string' && !field.options?.some(option => option.value === value)) select.append(new Option(`${value} (unlisted; preserved)`, value));
  select.value = value === undefined ? '' : value as string;
  select.addEventListener('change', () => commit(select.value)); return select;
});

export function currentPresentation(context: EditorRuntimeContext) {
  const artifact = context.snapshot?.artifact, descriptor = artifact?.presentation;
  if (!artifact?.manifest || !descriptor || descriptor.artifactType !== artifact.manifest.artifactType || descriptor.definitionVersion !== artifact.manifest.definitionVersion) return undefined;
  const check = new EditorDescriptorRegistry(); check.register(descriptor);
  return check.resolve(descriptor.artifactType, descriptor.definitionVersion);
}
function note(container: HTMLElement, message: string, openSource: () => void) {
  const text = document.createElement('p'); text.className = 'editor-compatibility'; text.textContent = message;
  const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Open source preview'; button.addEventListener('click', openSource);
  container.append(text, button);
}
/** Stateless rendering; every mutation reads the current context again. */
export function renderProperties(container: HTMLElement, context: EditorRuntimeContext, openSource: () => void,
  sections?: EditorSectionDescriptor[], registry = editorFields) {
  let descriptor: ReturnType<typeof currentPresentation>;
  try { descriptor = currentPresentation(context); } catch { note(container, 'Editor descriptor is invalid. Property editing is unavailable; source is preserved.', openSource); return; }
  if (!descriptor) { note(container, 'No compatible property descriptor for this artifact type and definition version, or the manifest is malformed. Source is preserved.', openSource); return; }
  const locator = context.snapshot?.artifact.locator;
  const descriptorId = descriptor.id;
  const caption = document.createElement('p'); caption.textContent = 'Editing diagnostics below describe current field representations and validator configurations. They do not replace saved-source validation.'; container.append(caption);
  function renderField(parent: HTMLElement, section: EditorSectionDescriptor, field: EditorFieldDescriptor, prefix: PropertyPath = []) {
    const path = [...prefix, ...field.path];
    const wrapper = document.createElement('uib-forms-field'); wrapper.setAttribute('label', field.label); wrapper.className = 'editor-property';
    const label = document.createElement('span'); label.slot = 'label'; label.textContent = field.label; wrapper.append(label); parent.append(wrapper);
    try {
      if (field.visibleWhen && readProperty(context, section, [...prefix, ...field.visibleWhen.path]).value !== field.visibleWhen.equals) { wrapper.remove(); return; }
      const { value, file } = readProperty(context, section, path);
      if (field.control === 'collection') {
        const items = collectionItems(value, field.itemKeys);
        if (!items.length) { const empty = document.createElement('p'); empty.textContent = 'No existing items. Collection creation and reordering are not available in this stage.'; wrapper.append(empty); }
        for (const item of items) {
          const group = document.createElement('fieldset'), legend = document.createElement('legend'); legend.textContent = item.value; group.append(legend); wrapper.append(group);
          for (const child of field.fields ?? []) renderField(group, section, { ...child, readOnly: field.readOnly || child.readOnly || false }, [...path, item]);
          if (field.itemKeys?.includes('validator')) {
            const row = readProperty(context, section, [...path, item]).value as Record<string, unknown>;
            const validator = new ValidatorRegistry().get(String(row.validator));
            const issue = validator?.validateConfiguration(row as { validator: string }) ?? (!validator ? 'Unknown validator configuration; preserved for the authoritative server.' : undefined);
            if (issue) { const diagnostic = document.createElement('p'); diagnostic.textContent = `Editing preview · validator.configuration · ${file}: ${issue}`; group.append(diagnostic); }
          }
        }
        return;
      }
      const factory = registry.get(field.control);
      if (!factory) throw new PropertyCompatibilityError('unavailable', `Field component ${field.control} is unavailable.`);
      const error = document.createElement('p'); error.setAttribute('role', 'status');
      const input = factory({ field, value, disabled: !context.canEdit || !!field.readOnly, commit: value => {
        try {
          if (context.snapshot?.artifact.locator !== locator || currentPresentation(context)?.id !== descriptorId) throw new Error('This property panel is no longer active.');
          writeProperty(context, section, field, path, value);
        }
        catch (failure) { error.textContent = failure instanceof Error ? failure.message : String(failure); }
      } });
      input.dataset.editorFocus = `${section.id}/${field.id}/${JSON.stringify(prefix)}`;
      wrapper.append(input, error);
      if (field.control === 'number' && value !== undefined && typeof value !== 'number') {
        error.textContent = `Editing draft · ${file} · ${field.path.join('.')}: incomplete numeric text is preserved as written; saved validation remains authoritative.`;
      }
      if (field.help) { const help = document.createElement('p'); help.textContent = field.help; wrapper.append(help); }
    } catch (error) {
      const kind = error instanceof PropertyCompatibilityError ? error.kind : 'unavailable';
      note(wrapper, `${kind === 'invalid' ? 'Invalid JSON source' : kind === 'unsupported' ? 'Unsupported visual structure' : 'Editor unavailable'} · ${section.role ?? 'artifact.json'} · ${field.path.join('.')}: ${error instanceof Error ? error.message : 'Field component failed.'}`, openSource);
    }
  }
  for (const section of sections ?? descriptor.sections) {
    const group = document.createElement('section'); const title = document.createElement('h3'); title.textContent = section.label; group.append(title); container.append(group);
    for (const field of section.fields) renderField(group, section, field);
  }
}
