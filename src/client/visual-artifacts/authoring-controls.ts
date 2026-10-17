import type { Action, ArtifactMetadata, DatasetDefinition, Expression, PublicInterface } from '@ui-platform/visual-artifacts';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; };
export function textControl(parent: HTMLElement, label: string, value = '') {
  const row = el('label', label), input = el('input'); input.value = value; input.setAttribute('aria-label', label); row.append(input); parent.append(row); return input;
}
function choice(parent: HTMLElement, label: string, values: Array<[string, string]>, value?: string) {
  const row = el('label', label), input = el('select'); input.setAttribute('aria-label', label); values.forEach(([key, name]) => input.add(new Option(name, key))); if (value !== undefined) input.value = value; row.append(input); parent.append(row); return input;
}
function button(parent: HTMLElement, label: string, run: () => void | Promise<void>, error: (cause: unknown) => void) {
  const node = el('button', label); node.type = 'button'; node.onclick = () => { void Promise.resolve().then(run).catch(error); }; parent.append(node); return node;
}
/** Edits ordinary typed values. Object members are UI controls, never executable expressions. */
export function valueControls(parent: HTMLElement, label: string, value: unknown, change: (value: unknown) => void, depth = 0) {
  const type = Array.isArray(value) ? 'array' : value === null || value === undefined ? 'string' : typeof value;
  if (type === 'object' || type === 'array') {
    if (depth > 8) { parent.append(el('p', `${label}: nested value exceeds the supported authoring depth.`)); return; }
    const group = el('fieldset'); group.append(el('legend', label)); parent.append(group);
    const current = value as Record<string, unknown>;
    for (const [key, item] of Object.entries(current)) valueControls(group, `${label}.${key}`, item, next => { const copy = structuredClone(value) as Record<string, unknown>; copy[key] = next; change(copy); }, depth + 1);
    const name = type === 'object' ? textControl(group, `${label} member name`) : undefined;
    const kind = choice(group, `${label} member type`, ['string', 'number', 'boolean', 'object', 'array'].map(v => [v, v]));
    button(group, `Add ${label} member`, () => {
      const key = name?.value ?? String((value as unknown[]).length);
      if (!/^[A-Za-z][\w]*$/.test(key) && type === 'object' || ['__proto__', 'prototype', 'constructor'].includes(key) || Object.hasOwn(current, key)) throw new Error('Choose a new ordinary member name.');
      const item = kind.value === 'number' ? 0 : kind.value === 'boolean' ? false : kind.value === 'object' ? {} : kind.value === 'array' ? [] : '';
      const copy = structuredClone(value) as Record<string, unknown>; copy[key] = item; change(copy);
    }, cause => group.append(el('p', String(cause)))); return;
  }
  const input = textControl(parent, label, String(value ?? '')); input.type = type === 'boolean' ? 'checkbox' : type === 'number' ? 'number' : 'text'; input.checked = value === true;
  input.onchange = () => change(type === 'boolean' ? input.checked : type === 'number' ? Number(input.value) : input.value);
}
/** Existing path/literal expression forms only; no new evaluator or source syntax. */
function expressionControl(parent: HTMLElement, label: string, initial?: Expression) {
  const group = el('fieldset'); group.append(el('legend', label)); parent.append(group);
  const mode = choice(group, `${label} source`, [['path', 'Named source path'], ['string', 'Literal text'], ['number', 'Literal number'], ['boolean', 'Literal boolean']], typeof initial === 'string' || !initial ? 'path' : 'literal' in initial ? typeof initial.literal : 'path');
  const input = textControl(group, `${label} value`, typeof initial === 'string' ? initial : initial && 'literal' in initial ? String(initial.literal) : 'route.id');
  return (): Expression => mode.value === 'path' ? input.value : { literal: mode.value === 'number' ? Number(input.value) : mode.value === 'boolean' ? input.value === 'true' : input.value };
}
export interface AuthoringOptions {
  metadata: ArtifactMetadata; node?: string; bindingTargets?: string[]; events?: string[]; slots?: string[];
  change: (edit: (metadata: ArtifactMetadata) => void) => void;
  slot?: { value: string; choices: string[]; change(value: string): void };
  datasets(): Promise<Array<{ name?: string; appliedSchema?: DatasetDefinition }>>;
  error(cause: unknown): void;
  draft?: { kind?: string; event?: string; datasets?: Array<{ name?: string; appliedSchema?: DatasetDefinition }> };
  refresh?(): void;
}
export function compositionAuthoring(parent: HTMLElement, options: AuthoringOptions) {
  const { metadata, node, change, error } = options;
  if (!node) {
    const name = textControl(parent, 'Artifact display name', metadata.displayName); name.onchange = () => change(m => { m.displayName = name.value; });
    if (metadata.kind === 'page') { const route = textControl(parent, 'Page route', metadata.route); route.onchange = () => change(m => { m.route = route.value; }); }
    const group = el('fieldset'); group.append(el('legend', 'Local state')); parent.append(group);
    for (const [key, value] of Object.entries(metadata.state ?? {})) valueControls(group, `State ${key}`, value, next => change(m => { m.state![key] = next; }));
    const state = textControl(group, 'New local state');
    const stateType = choice(group, 'New local state type', ['result', 'string', 'number', 'boolean', 'object', 'array'].map(value => [value, value]));
    button(group, 'Declare local state', () => { if (!/^[A-Za-z][\w]*$/.test(state.value) || ['constructor', 'prototype', '__proto__'].includes(state.value) || Object.hasOwn(metadata.state ?? {}, state.value)) throw new Error('Choose a new local state name.'); change(m => { (m.state ??= {})[state.value] = stateType.value === 'object' ? {} : stateType.value === 'array' ? [] : stateType.value === 'number' ? 0 : stateType.value === 'boolean' ? false : stateType.value === 'string' ? '' : null; }); }, error);
    if (metadata.kind !== 'page') publicControls(parent, metadata.public, change, error);
    return;
  }
  if (options.slot) {
    const slot = choice(parent, 'Instance child slot', [['', 'Unassigned'], ...options.slot.choices.map(v => [v, v] as [string, string])], options.slot.value);
    slot.onchange = () => options.slot!.change(slot.value);
  }
  if (options.slots?.length) parent.append(el('p', `Declared slots: ${options.slots.join(', ')}. Insert a child and assign its slot.`));
  const binding = el('fieldset'); binding.append(el('legend', 'Instance binding')); parent.append(binding);
  const targets = options.bindingTargets ?? ['text'];
  const target = choice(binding, 'Binding target', targets.map(v => [v, v]));
  const expr = expressionControl(binding, 'Binding');
  button(binding, 'Apply binding', () => change(m => { m.bindings = [...(m.bindings ?? []).filter(item => !(item.node === node && item.target === target.value)), { node, target: target.value, value: expr() }]; }), error);
  for (const existing of metadata.bindings?.filter(item => item.node === node) ?? []) {
    const row = el('p', `${existing.target}: ${typeof existing.value === 'string' ? existing.value : 'declarative expression'}`); binding.append(row);
    button(row, `Remove binding ${existing.target}`, () => change(m => { m.bindings = m.bindings?.filter(item => item !== m.bindings?.find(candidate => candidate.node === node && candidate.target === existing.target)); }), error);
  }
  const events = el('fieldset'); events.append(el('legend', 'Event action')); parent.append(events);
  if (!options.events?.length) { events.append(el('p', 'No public event metadata is declared for this Component.')); return; }
  const draft = options.draft ?? {};
  const event = choice(events, 'Action event', options.events.map(v => [v, v]), draft.event); event.onchange = () => { draft.event = event.value; };
  const kind = choice(events, 'Action kind', [['navigate', 'Navigate'], ['set', 'Set local state'], ['emit', 'Emit public event'], ['service', 'Existing Dataset service'], ['record-delete', 'Protected single-record delete']], draft.kind);
  const details = el('div'); events.append(details);
  const render = () => {
    details.replaceChildren();
    const add = (action: () => Action) => button(details, 'Add event action', () => change(m => { const declaration = m.events?.find(item => item.node === node && item.event === event.value); if (declaration) declaration.actions.push(action()); else (m.events ??= []).push({ node, event: event.value, actions: [action()] }); }), error);
    if (kind.value === 'record-delete') {
      const explanation = el('p', 'Resolve an applied Dataset and its permanent primary field. DOE enforces current permissions and record eligibility.'); details.append(explanation);
      const renderTargets = (datasets: Array<{ name?: string; appliedSchema?: DatasetDefinition }>) => {
        const selected = choice(details, 'Delete Dataset', datasets.map(item => [item.appliedSchema!.dataset.id, item.name ?? item.appliedSchema!.dataset.name]));
        const record = expressionControl(details, 'Delete record');
        const result = choice(details, 'Delete result state', Object.keys(metadata.state ?? {}).map(v => [v, v]));
        add(() => {
          const schema = datasets.find(item => item.appliedSchema!.dataset.id === selected.value)?.appliedSchema;
          const primary = schema?.fields.filter(field => field.type === 'id');
          if (!schema || primary?.length !== 1 || !result.value) throw new Error('An applied Dataset with one declared primary identity and an explicit local result state are required.');
          return { kind: 'record-delete', version: 1, datasetId: schema.dataset.id, primaryFieldId: primary[0].id, recordId: record(), resultState: result.value };
        });
      };
      if (draft.datasets) renderTargets(draft.datasets);
      button(details, 'Load applied delete targets', async () => { draft.datasets = (await options.datasets()).filter(item => item.appliedSchema); options.refresh?.(); }, error); return;
    }
    if (kind.value === 'navigate') { const to = expressionControl(details, 'Destination', { literal: '/' }); add(() => ({ kind: 'navigate', to: to() })); }
    else if (kind.value === 'set') { const state = choice(details, 'Action local state', Object.keys(metadata.state ?? {}).map(v => [v, v])); const value = expressionControl(details, 'Action value'); add(() => { if (!state.value) throw new Error('Declare local state first.'); return { kind: 'set', state: state.value, value: value() }; }); }
    else if (kind.value === 'service') { const reference = choice(details, 'Existing service', [['dataset.read', 'Protected Dataset read'], ['dataset.write', 'Protected Dataset write']]); const input = expressionControl(details, 'Service input'); add(() => ({ kind: 'service', reference: reference.value, input: input() })); }
    else {
      const emitted = choice(details, 'Public event', Object.keys(metadata.public?.events ?? {}).map(v => [v, v]));
      const payload = el('div'); details.append(payload); let values: Record<string, () => Expression> = {};
      const refresh = () => { payload.replaceChildren(); values = Object.fromEntries(Object.keys(metadata.public?.events[emitted.value]?.payload ?? {}).map(key => [key, expressionControl(payload, `Payload ${key}`)])); }; emitted.onchange = refresh; refresh();
      add(() => { if (!emitted.value) throw new Error('Declare a public event first.'); return { kind: 'emit', event: emitted.value, payload: Object.fromEntries(Object.entries(values).map(([key, get]) => [key, get()])) }; });
    }
  }; kind.onchange = () => { draft.kind = kind.value; render(); }; render();
  for (const declaration of metadata.events?.filter(item => item.node === node) ?? []) declaration.actions.forEach((action, index) => {
    const row = el('p', `${declaration.event}: ${action.kind}`); events.append(row);
    button(row, `Remove ${declaration.event} action ${index + 1}`, () => change(m => { const item = m.events!.find(item => item.node === node && item.event === declaration.event)!; item.actions.splice(index, 1); if (!item.actions.length) m.events = m.events!.filter(other => other !== item); }), error);
  });
}
function publicControls(parent: HTMLElement, api: PublicInterface | undefined, change: AuthoringOptions['change'], error: AuthoringOptions['error']) {
  const group = el('fieldset'); group.append(el('legend', 'Shared public contract')); parent.append(group);
  const name = textControl(group, 'Public member name');
  const kind = choice(group, 'Public member kind', [['property', 'Property'], ['event', 'Event'], ['slot', 'Slot']]);
  const type = choice(group, 'Public property type', ['string', 'number', 'boolean', 'object', 'array'].map(v => [v, v]));
  const required = textControl(group, 'Required public property'); required.type = 'checkbox';
  button(group, 'Declare public member', () => {
    if (!/^[A-Za-z][\w]*$/.test(name.value) || ['constructor', 'prototype', '__proto__'].includes(name.value)) throw new Error('Choose an ordinary public member name.');
    change(m => { const target = m.public ??= { properties: {}, events: {}, slots: [] };
      if (kind.value === 'slot') { if (target.slots.includes(name.value)) throw new Error('Slot already declared.'); target.slots.push(name.value); }
      else if (kind.value === 'event') { if (target.events[name.value]) throw new Error('Event already declared.'); target.events[name.value] = { payload: {} }; }
      else { if (target.properties[name.value]) throw new Error('Property already declared.'); target.properties[name.value] = { type: type.value as 'string', required: required.checked, default: type.value === 'object' ? {} : type.value === 'array' ? [] : type.value === 'boolean' ? false : type.value === 'number' ? 0 : '' }; }
    });
  }, error);
  for (const [key, contract] of Object.entries(api?.properties ?? {})) valueControls(group, `Public default ${key}`, contract.default, value => change(m => { m.public!.properties[key].default = value; }));
  for (const event of Object.keys(api?.events ?? {})) {
    const field = textControl(group, `${event} payload field`); const fieldType = choice(group, `${event} payload type`, ['string', 'number', 'boolean', 'object', 'array'].map(v => [v, v]));
    button(group, `Add ${event} payload field`, () => { if (!/^[A-Za-z][\w]*$/.test(field.value) || ['constructor', 'prototype', '__proto__'].includes(field.value)) throw new Error('Choose an ordinary payload field.'); change(m => { if (m.public!.events[event].payload[field.value]) throw new Error('Payload field already declared.'); m.public!.events[event].payload[field.value] = { type: fieldType.value as 'string', required: true }; }); }, error);
  }
  group.append(el('p', `Slots: ${api?.slots.join(', ') || 'none'}`));
}
