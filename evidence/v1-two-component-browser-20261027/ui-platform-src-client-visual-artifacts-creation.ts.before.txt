/** UI adapter only. Existing Visual services allocate all permanent identities. */
export function chooseVisualCreation(kind: 'page' | 'shell' | 'component', shells: Array<{ id: string; name: string }>) {
  const title = kind === 'page' ? 'Create Page' : kind === 'shell' ? 'Create Shell' : 'Create Platform Component';
  const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', title);
  const heading = document.createElement('h2'); heading.textContent = title;
  const name = document.createElement('input'); name.setAttribute('aria-label', 'Artifact name'); name.pattern = '[a-z][a-z0-9-]*'; name.required = true;
  const route = document.createElement('input'); route.setAttribute('aria-label', 'Page route'); route.value = '/'; route.hidden = kind !== 'page';
  const shell = document.createElement('select'); shell.setAttribute('aria-label', 'Page Shell'); shell.add(new Option('Application default Shell', '')); shells.forEach(item => shell.add(new Option(item.name, item.id))); shell.hidden = kind !== 'page';
  const create = document.createElement('button'); create.textContent = 'Create'; const cancel = document.createElement('button'); cancel.textContent = 'Cancel';
  dialog.append(heading, name, route, shell, create, cancel); document.body.append(dialog); dialog.showModal(); name.focus();
  return new Promise<{ name: string; route?: string; shellId?: string } | undefined>(resolve => {
    const close = (value?: { name: string; route?: string; shellId?: string }) => { dialog.close(); dialog.remove(); resolve(value); };
    cancel.onclick = () => close(); dialog.oncancel = event => { event.preventDefault(); close(); };
    create.onclick = () => { if (name.reportValidity()) close({ name: name.value, ...(kind === 'page' ? { route: route.value, shellId: shell.value } : {}) }); };
  });
}
