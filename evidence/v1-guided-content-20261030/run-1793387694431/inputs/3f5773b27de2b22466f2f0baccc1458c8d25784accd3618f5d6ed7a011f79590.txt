import type { CompositionDefinition, MenuItem, MenuDestination } from '@ui-platform/visual-artifacts';

export function chooseMenuName(): Promise<string | undefined> {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', 'Create Menu');
    const form = document.createElement('form'); form.method = 'dialog';
    const label = document.createElement('label'); label.textContent = 'Menu name';
    const input = document.createElement('input'); input.required = true; input.setAttribute('aria-label', 'Menu name'); label.append(input);
    const create = document.createElement('button'); create.textContent = 'Create Menu';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel'; cancel.onclick = () => dialog.close();
    let result: string | undefined;
    form.onsubmit = event => { event.preventDefault(); if (input.value.trim()) { result = input.value.trim(); dialog.close(); } };
    dialog.onclose = () => { dialog.remove(); resolve(result); };
    form.append(label, create, cancel); dialog.append(form); document.body.append(dialog); dialog.showModal(); input.focus();
  });
}

/** Authoring adapter only. The native composition validator remains authoritative. */
export function chooseMenuItem(definition: CompositionDefinition, existing?: MenuItem): Promise<MenuItem | undefined> {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', 'Menu item');
    const form = document.createElement('form'); form.method = 'dialog'; dialog.append(form);
    const field = <T extends HTMLElement>(name: string, input: T) => { const label = document.createElement('label'); label.append(name, input); input.setAttribute('aria-label', name); form.append(label); return input; };
    const label = field('Menu item label', document.createElement('input')); label.required = true; label.value = existing?.label ?? '';
    const kind = field('Destination kind', document.createElement('select'));
    for (const value of ['page', 'route', 'url']) kind.add(new Option(value === 'url' ? 'External URL' : value === 'page' ? 'Application Page' : 'Application Route', value));
    const unsupported = existing?.destination.kind === 'action';
    if (unsupported) kind.add(new Option('Existing action (preserved)', 'action'));
    kind.value = existing?.destination.kind ?? 'page';
    const destination = field('Page or Route destination', document.createElement('select'));
    const url = field('External URL', document.createElement('input')); url.type = 'url'; url.value = existing?.destination.kind === 'url' ? existing.destination.url : '';
    const parameters = document.createElement('fieldset'); form.append(parameters);
    const target = field('Browser target', document.createElement('select')); for (const value of ['_self', '_blank', '_parent', '_top']) target.add(new Option(value, value)); target.value = existing?.target ?? '_self';
    let selected: MenuDestination = structuredClone(existing?.destination ?? { kind: 'page', pageId: definition.pages[0]?.metadata.artifactId ?? '' });
    const parameterInputs = new Map<string, { mode: HTMLSelectElement; value: HTMLInputElement }>();
    function drawParameters() {
      parameters.replaceChildren(); parameterInputs.clear();
      const route = definition.routes.find(route => kind.value === 'page' ? route.pageId === destination.value : route.routeId === destination.value);
      const params = selected.kind === 'page' || selected.kind === 'route' ? selected.params ?? {} : {};
      const keys = [...new Set([...(route?.path.matchAll(/:([A-Za-z][\w]*)|\[([A-Za-z][\w]*)\]/g) ?? [])].map(match => match[1] ?? match[2]))];
      for (const key of keys) {
        const group = document.createElement('label'); group.append(`Parameter ${key}`);
        const mode = document.createElement('select'); mode.setAttribute('aria-label', `Parameter ${key} source`); mode.add(new Option('Current route value', 'inherit')); mode.add(new Option('Literal value', 'literal')); mode.value = Object.hasOwn(params, key) ? 'literal' : 'inherit';
        const value = document.createElement('input'); value.setAttribute('aria-label', `Parameter ${key} value`); value.value = params[key] ?? ''; value.disabled = mode.value !== 'literal'; mode.onchange = () => { value.disabled = mode.value !== 'literal'; };
        group.append(mode, value); parameters.append(group); parameterInputs.set(key, { mode, value });
      }
      if (Object.keys(params).some(key => !keys.includes(key))) parameters.append('Additional existing parameter bindings are retained.');
      parameters.hidden = !['page', 'route'].includes(kind.value);
    }
    function draw(reset = false) {
      destination.replaceChildren();
      const choices = kind.value === 'page' ? definition.pages.map(page => [page.metadata.artifactId, `${page.metadata.displayName} (${page.metadata.route})`]) : definition.routes.filter(route => route.routeId).map(route => [route.routeId!, route.path]);
      for (const [id, text] of choices) destination.add(new Option(text, id));
      const id = selected.kind === 'page' ? selected.pageId : selected.kind === 'route' ? selected.routeId : '';
      if (!reset && id && !choices.some(([key]) => key === id)) destination.add(new Option(`Missing target: ${id}`, id));
      if (!reset && id) destination.value = id;
      destination.parentElement!.hidden = !['page', 'route'].includes(kind.value); destination.required = !destination.parentElement!.hidden;
      url.parentElement!.hidden = kind.value !== 'url'; url.required = kind.value === 'url';
      drawParameters();
    }
    kind.onchange = () => { selected = kind.value === 'page' ? { kind: 'page', pageId: '' } : kind.value === 'route' ? { kind: 'route', routeId: '' } : kind.value === 'action' ? existing!.destination : { kind: 'url', url: '' }; draw(true); };
    destination.onchange = () => { selected = kind.value === 'page' ? { kind: 'page', pageId: destination.value } : { kind: 'route', routeId: destination.value }; drawParameters(); };
    const error = document.createElement('p'); error.setAttribute('role', 'alert'); form.append(error);
    const save = document.createElement('button'); save.textContent = existing ? 'Apply Menu item' : 'Add Menu item'; save.type = 'submit';
    const cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.type = 'button'; cancel.onclick = () => dialog.close(); form.append(save, cancel);
    let result: MenuItem | undefined;
    form.onsubmit = event => {
      event.preventDefault();
      if (kind.value === 'url' && !/^https?:\/\//i.test(url.value)) { error.textContent = 'External URLs must use HTTP or HTTPS.'; return; }
      const params = selected.kind === 'page' || selected.kind === 'route' ? { ...selected.params } : {};
      for (const [key, input] of parameterInputs) { if (input.mode.value === 'literal') params[key] = input.value.value; else delete params[key]; }
      const next: MenuDestination = kind.value === 'action' ? structuredClone(existing!.destination) : kind.value === 'url' ? { kind: 'url', url: url.value } : kind.value === 'page' ? { kind: 'page', pageId: destination.value, ...(Object.keys(params).length ? { params } : {}) } : { kind: 'route', routeId: destination.value, ...(Object.keys(params).length ? { params } : {}) };
      result = { ...existing, itemId: existing?.itemId ?? `item-${crypto.randomUUID()}`, label: label.value, destination: next, target: target.value as MenuItem['target'] }; dialog.close();
    };
    dialog.onclose = () => { dialog.remove(); resolve(result); }; document.body.append(dialog); draw(); dialog.showModal();
  });
}

export function chooseNamedValue(title: string, choices: Array<{ value: string; label: string }>): Promise<string | undefined> {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', title); const form = document.createElement('form'); form.method = 'dialog';
    const label = document.createElement('label'); label.textContent = title; const select = document.createElement('select'); select.setAttribute('aria-label', title); select.required = true; for (const item of choices) select.add(new Option(item.label, item.value)); label.append(select);
    const apply = document.createElement('button'); apply.textContent = 'Apply selection'; const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel'; cancel.onclick = () => dialog.close(); form.append(label, apply, cancel); dialog.append(form);
    let result: string | undefined; form.onsubmit = event => { event.preventDefault(); result = select.value; dialog.close(); }; dialog.onclose = () => { dialog.remove(); resolve(result); }; document.body.append(dialog); dialog.showModal();
  });
}
