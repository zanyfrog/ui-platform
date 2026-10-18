import type { AutomationAction, AutomationDefinition, AutomationValue } from '../../shared/automation.js';
import type { AutomationAuthoringCatalog } from '../../shared/automation-service-contract.js';

const node = (tag: string, text?: string) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; return e; };
function select(parent: HTMLElement, label: string, items: string[], value: string, change: (value: string) => void) {
  const l = node('label', label), input = document.createElement('select'); input.setAttribute('aria-label', label);
  for (const v of [...new Set([value, ...items])].filter(Boolean)) input.add(new Option(v, v)); input.value = value;
  input.onchange = () => change(input.value); l.append(input); parent.append(l); return input;
}
function text(parent: HTMLElement, label: string, value: string, change: (value: string) => void, type = 'text') {
  const l = node('label', label), input = document.createElement('input'); input.type = type; input.value = value; input.setAttribute('aria-label', label);
  input.onchange = () => change(input.value); l.append(input); parent.append(l);
}
function button(parent: HTMLElement, label: string, click: () => void) { const b = document.createElement('button'); b.textContent = label; b.type = 'button'; b.onclick = click; parent.append(b); }

/** Controls serialize only the native AutomationValue contract. No executable text or JSON editor. */
export function automationValueControl(parent: HTMLElement, label: string, value: AutomationValue, fields: string[], change: (value: AutomationValue) => void, depth = 0) {
  const box = node('fieldset'); box.append(node('legend', label)); parent.append(box);
  const mode = 'literal' in value ? value.literal === null ? 'null' : typeof value.literal : 'fields' in value ? 'fields' : value.from;
  select(box, label + ' source', ['string', 'number', 'boolean', 'null', 'record', 'oldRecord', 'newRecord', 'context', ...(depth < 3 ? ['fields'] : [])], mode, m => {
    change(m === 'fields' ? { fields: {} } : ['record', 'oldRecord', 'newRecord', 'context'].includes(m) ? { from: m as 'record', path: [fields[0] ?? 'id'] } : { literal: m === 'number' ? 0 : m === 'boolean' ? false : m === 'null' ? null : '' });
  });
  if ('fields' in value) {
    for (const [key, child] of Object.entries(value.fields)) {
      automationValueControl(box, `${label}.${key}`, child, fields, v => change({ fields: { ...value.fields, [key]: v } }), depth + 1);
      button(box, `Remove ${label}.${key}`, () => { const next = { ...value.fields }; delete next[key]; change({ fields: next }); });
    }
    let name = ''; text(box, label + ' member name', '', v => { name = v; });
    button(box, `Add ${label} member`, () => { if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(name) || ['__proto__', 'prototype', 'constructor'].includes(name) || Object.hasOwn(value.fields, name)) return; change({ fields: { ...value.fields, [name]: { literal: '' } } }); });
  } else if ('from' in value) {
    const paths = value.from === 'context' ? ['primaryRecordId', 'workflowId', 'executionId', 'operationId', 'phase', 'operation', 'datasetId', 'recordIds', 'recordExecutionId'] : fields;
    select(box, label + ' path', paths, value.path.join('.'), v => change({ from: value.from, path: v.split('.') }));
  } else if (mode === 'string' || mode === 'number') text(box, label + ' value', String(value.literal), v => change({ literal: mode === 'number' ? Number(v) : v }), mode === 'number' ? 'number' : 'text');
  else if (mode === 'boolean') select(box, label + ' value', ['true', 'false'], String(value.literal), v => change({ literal: v === 'true' }));
  else if (mode !== 'null') box.append(node('p', 'This saved literal is unsupported by typed controls. Its source is retained; use an explicit supported value or advanced repair.'));
}

export function automationActionControls(parent: HTMLElement, definition: AutomationDefinition, catalog: AutomationAuthoringCatalog | undefined, update: (edit: (d: AutomationDefinition) => void) => void) {
  const schema = catalog?.datasets.find(d => d.id === definition.datasetId), fields = schema?.fields.map(f => f.key) ?? [];
  const services = catalog?.services ?? [];
  parent.replaceChildren();
  for (const [index, action] of definition.actions.entries()) {
    const box = node('fieldset'); box.setAttribute('data-action-index', String(index)); box.append(node('legend', `Step ${index + 1}: ${action.id}`)); parent.append(box);
    const edit = (fn: (a: AutomationAction) => void) => update(d => fn(d.actions[index]!));
    box.append(node('p', `Action: ${action.type}. Permanent action ID: ${action.id}`));
    if (definition.kind === 'trigger') select(box, 'Scope', ['each', 'batch'], action.scope ?? 'each', v => edit(a => { a.scope = v as 'each' | 'batch'; }));
    if (action.type === 'service') {
      const approved = services.find(s => s.id === action.service);
      select(box, 'Approved service', services.map(s => s.id), action.service, v => edit(a => { if (a.type === 'service') a.service = v; }));
      box.append(node('p', approved ? `Contract v${approved.version}; in-memory reference effect, Workflow or afterCommit only.` : 'This service has no authorized registered contract. Execution will be rejected.'));
      automationValueControl(box, 'Service input', action.input, fields, v => edit(a => { if (a.type === 'service') a.input = v; }));
    } else if (action.type === 'set') {
      select(box, 'Pending field', fields.filter(f => f !== definition.primaryKey), action.field, v => edit(a => { if (a.type === 'set') a.field = v; }));
      select(box, 'Only if missing', ['true', 'false'], String(action.ifMissing ?? false), v => edit(a => { if (a.type === 'set') a.ifMissing = v === 'true'; }));
      automationValueControl(box, 'Pending value', action.value, fields, v => edit(a => { if (a.type === 'set') a.value = v; }));
    } else if (action.type === 'reject') text(box, 'Rejection message', action.message, v => edit(a => { if (a.type === 'reject') a.message = v; }));
    else {
      select(box, 'Action Dataset', catalog?.datasets.map(d => d.id) ?? [], action.datasetId, v => edit(a => { if (a.type === 'crud') a.datasetId = v; }));
      box.append(node('p', 'Only the applied host Dataset is supported. Other saved targets are retained and rejected, never remapped.'));
      const binding = action.operation === 'read' ? action.query : action.records;
      automationValueControl(box, action.operation === 'read' ? 'Query' : 'Records', binding, fields, v => edit(a => { if (a.type === 'crud') { if (a.operation === 'read') a.query = v; else a.records = v; } }));
    }
    if (index) button(box, 'Move up', () => update(d => { [d.actions[index - 1], d.actions[index]] = [d.actions[index]!, d.actions[index - 1]!]; }));
    if (index < definition.actions.length - 1) button(box, 'Move down', () => update(d => { [d.actions[index + 1], d.actions[index]] = [d.actions[index]!, d.actions[index + 1]!]; }));
    button(box, 'Remove action', () => update(d => { d.actions.splice(index, 1); }));
  }
  let selected = 'read';
  select(parent, 'New action type', ['read', 'insert', 'update', 'delete', ...(definition.kind === 'trigger' ? ['set', 'reject'] : []), ...(services.length ? ['service'] : [])], selected, v => { selected = v; });
  if (!services.length) parent.append(node('p', 'No approved services are available. Register the approved host capability and activate a dedicated invocation grant.'));
  button(parent, 'Add typed action', () => update(d => {
    const id = `action-${crypto.randomUUID()}`, scope = d.kind === 'trigger' ? { scope: 'each' as const } : {};
    d.actions.push(selected === 'service' ? { id, ...scope, type: 'service', service: services[0]!.id, input: { fields: { message: { literal: 'Reference notification' } } } }
      : selected === 'set' ? { id, ...scope, type: 'set', field: fields.find(f => f !== d.primaryKey) ?? '', value: { literal: '' } }
      : selected === 'reject' ? { id, ...scope, type: 'reject', message: 'Operation rejected' }
      : selected === 'read' ? { id, ...scope, type: 'crud', datasetId: d.datasetId, operation: 'read', query: { fields: {} } }
      : { id, ...scope, type: 'crud', datasetId: d.datasetId, operation: selected as 'insert' | 'update' | 'delete', records: { fields: { [d.primaryKey]: { from: 'record', path: [d.primaryKey] } } } });
  }));
}
