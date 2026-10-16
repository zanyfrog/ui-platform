import type { DatasetDefinition } from '@ui-platform/visual-artifacts';
import { createEditorSessionBinding } from './session.js';
/** Ordinary creation uses the same Visual creation service and owner-qualified WP3 discovery. */
export async function chooseFormCreation(applicationKey: string): Promise<{ name: string; form: { dataset?: DatasetDefinition } } | undefined> {
  const binding = createEditorSessionBinding();
  const response = await fetch(`/api/apps/${encodeURIComponent(applicationKey)}/datasets/discovery`, { headers: await binding.headers(), cache: 'no-store' });
  const choices = await response.json() as Array<{ name: string; appliedSchema?: DatasetDefinition }>; binding.assert();
  if (!response.ok) throw new Error('Dataset discovery denied.');
  const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', 'Create Form');
  const title = document.createElement('h2'); title.textContent = 'Create Form';
  const name = document.createElement('input'); name.setAttribute('aria-label', 'Form name'); name.placeholder = 'person-form'; name.pattern = '[a-z][a-z0-9-]*'; name.required = true;
  const dataset = document.createElement('select'); dataset.setAttribute('aria-label', 'Create Form from'); dataset.append(new Option('Blank Form', ''));
  for (const choice of choices) if (choice.appliedSchema) dataset.append(new Option(choice.name ?? choice.appliedSchema.dataset.name, choice.appliedSchema.dataset.id));
  const note = document.createElement('p'); note.textContent = 'Choose a verified applied Dataset or start blank. Unsupported fields will be exposed for explicit safe mapping; no fields are silently converted.';
  dataset.onchange = () => { const selected = choices.find(c => c.appliedSchema?.dataset.id === dataset.value)?.appliedSchema;
    const unsupported = selected?.fields.filter(f => !['id','string','number','integer','boolean','date'].includes(f.type)) ?? [];
    note.textContent = unsupported.length ? `Requires explicit safe manual mapping: ${unsupported.map(f => `${f.key} (${f.type}${f.required ? ', required' : ''})`).join(', ')}. Nothing is silently converted; required mappings block submission until complete.` : 'Blank or supported controls. Date values use exact UTC ISO text with no time-zone conversion.'; };
  const create = document.createElement('button'); create.textContent = 'Create'; create.type = 'button';
  const cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.type = 'button';
  dialog.append(title, name, dataset, note, create, cancel); document.body.append(dialog); dialog.showModal(); name.focus();
  return new Promise((resolve, reject) => {
    const close = (value?: { name: string; form: { dataset?: DatasetDefinition } }) => { dialog.close(); dialog.remove(); resolve(value); };
    cancel.onclick = () => close(); dialog.oncancel = event => { event.preventDefault(); close(); };
    create.onclick = () => { if (!name.reportValidity()) return; try { binding.assert(); const selected = choices.find(c => c.appliedSchema?.dataset.id === dataset.value)?.appliedSchema; close({ name: name.value, form: selected ? { dataset: selected } : {} }); } catch (error) { dialog.close(); dialog.remove(); reject(error); } };
  });
}
