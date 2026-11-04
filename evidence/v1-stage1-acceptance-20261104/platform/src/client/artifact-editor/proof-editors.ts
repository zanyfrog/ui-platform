import type { EditorFieldDescriptor, EditorSectionDescriptor } from '../../shared/editor-presentation.js';
import type { EditorRuntimeContext } from './context.js';
import { collectionItems, mutateCollection, readProperty, writeProperty, type PropertyPath } from './property-bindings.js';
import type { EditorPluginScope } from './plugins.js';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; }
function action(label: string, click: () => void, disabled = false) { const button = el('button', label); button.type = 'button'; button.disabled = disabled; button.addEventListener('click', click); return button; }
function formSection(context: EditorRuntimeContext): { section: EditorSectionDescriptor; field: EditorFieldDescriptor } | undefined {
  const descriptor = context.snapshot?.artifact.presentation;
  const section = descriptor?.sections.find(value => value.id === 'form-fields');
  const field = section?.fields.find(value => value.id === 'fields');
  return section && field ? { section, field } : undefined;
}
function newId(items: Record<string, unknown>[]) {
  const used = new Set(items.map(item => typeof item.id === 'string' ? item.id : ''));
  for (let index = 1; ; index++) { const id = `field-${index}`; if (!used.has(id)) return id; }
}

/** Form proof editor: creation, deletion and reordering are intentionally limited to identified fields. */
export function renderFormProofEditor(container: HTMLElement, context: EditorRuntimeContext, scope: EditorPluginScope) {
  const render = () => {
    container.replaceChildren();
    const binding = formSection(context);
    if (!binding) { container.append(el('p', 'Form fields are unavailable because the descriptor or definition is incompatible. Source is preserved.')); return; }
    let items: Record<string, unknown>[], identities: { key: string; value: string }[];
    try { items = readProperty(context, binding.section, ['fields']).value as Record<string, unknown>[]; identities = collectionItems(items, binding.field.itemKeys); }
    catch (error) { container.append(el('p', error instanceof Error ? error.message : String(error)), action('Open source', scope.openSource)); return; }
    const heading = el('p', 'Form proof editor · fields, Properties, plugins and Source share this working copy.'); container.append(heading);
    const list = el('div'); list.className = 'proof-collection';
    items.forEach((item, index) => {
      const row = el('article'); row.className = 'proof-collection-row';
      const identity = identities[index];
      const title = el('strong', `${identity.value} · ${String(item.field ?? 'unnamed')}`); row.append(title);
      const labelInput = el('input'); labelInput.type = 'text'; labelInput.value = typeof item.label === 'string' ? item.label : ''; labelInput.setAttribute('aria-label', `Label for ${identity.value}`); labelInput.disabled = !context.canEdit;
      labelInput.addEventListener('change', () => writeProperty(context, binding.section, { ...binding.field, control: 'collection' }, ['fields', identity, 'label'], labelInput.value)); row.append(labelInput);
      const controls = el('div'); controls.className = 'proof-collection-actions';
      controls.append(action('Move up', () => mutateCollection(context, binding.section, binding.field, ['fields'], values => { if (index > 0) [values[index - 1], values[index]] = [values[index], values[index - 1]]; return values; }), !context.canEdit || index === 0));
      controls.append(action('Move down', () => mutateCollection(context, binding.section, binding.field, ['fields'], values => { if (index < values.length - 1) [values[index], values[index + 1]] = [values[index + 1], values[index]]; return values; }), !context.canEdit || index === items.length - 1));
      controls.append(action('Delete field', () => mutateCollection(context, binding.section, binding.field, ['fields'], values => values.filter((_, valueIndex) => valueIndex !== index)), !context.canEdit));
      row.append(controls); list.append(row);
    });
    container.append(list, action('Add text field', () => mutateCollection(context, binding.section, binding.field, ['fields'], values => [...values, { id: newId(values), field: `field${values.length + 1}`, type: 'text', label: `Field ${values.length + 1}` }]), !context.canEdit));
  };
  scope.subscribe(render); render();
}

/** Route proof editor: a small resolved-path preview plus direct source-backed controls. */
export function renderRouteProofEditor(container: HTMLElement, context: EditorRuntimeContext, scope: EditorPluginScope) {
  const render = () => {
    container.replaceChildren();
    const artifact = context.snapshot?.artifact, manifest = artifact?.manifest;
    if (!manifest || !['route', 'routeGroup'].includes(manifest.artifactType)) { container.append(el('p', 'Route proof editor is unavailable for this artifact.')); return; }
    const path = typeof manifest.config?.path === 'string' ? manifest.config.path : '';
    container.append(el('p', 'Route proof editor · the preview is derived from the shared manifest working copy.'), el('p', path ? `Resolved local path: ${path.startsWith('/') ? path : `/${path}`}` : 'No valid route path is currently configured.'));
    const input = el('input'); input.type = 'text'; input.value = path; input.setAttribute('aria-label', 'Route path proof editor'); input.disabled = !context.canEdit;
    input.addEventListener('input', () => { const section = { id: 'route-proof', label: 'Route proof', target: 'manifest' as const, fields: [] }; writeProperty(context, section, { id: 'route-path', label: 'Route path', control: 'text', path: ['config', 'path'] }, ['config', 'path'], input.value); });
    container.append(input);
    if (manifest.artifactType === 'route') {
      const page = el('input'); page.type = 'text'; page.value = typeof manifest.config?.page === 'string' ? manifest.config.page : ''; page.setAttribute('aria-label', 'Page reference proof editor'); page.disabled = !context.canEdit;
      page.addEventListener('input', () => { const section = { id: 'route-proof', label: 'Route proof', target: 'manifest' as const, fields: [] }; writeProperty(context, section, { id: 'page', label: 'Page reference', control: 'text', path: ['config', 'page'] }, ['config', 'page'], page.value); });
      container.append(page);
    }
  };
  scope.subscribe(render); render();
}
