// Acceptance harness: standard controls and runtime, with no application function handlers.
import '@ui-base/ui/card';
import '@ui-base/forms';
import ui from '../../node_modules/@ui-base/ui/ui.component.json';
import forms from '../../node_modules/@ui-base/forms/ui.component.json';
import schema from './inventory.dataset.json';
import { generateForm } from '../../packages/visual-artifacts/src/form';
import { mountVisualArtifact, type ArtifactInstance } from '../../packages/visual-artifacts/src/runtime';
import { compositionAuthoring } from '../../src/client/visual-artifacts/authoring-controls';
import { createApplicationDataServices } from '../../packages/platform-core/src/application-data';
import type { ArtifactMetadata, PackageComponent, RuntimeArtifact } from '../../packages/visual-artifacts/src/model';

const packages = [...ui.components, ...forms.components].map((entry: any) => ({ ...entry, id: entry.identity?.componentId ?? `@ui-base/${entry.tagName}`, definition: entry.identity ? entry : undefined })) as PackageComponent[];
const formMetadata: ArtifactMetadata = { schemaVersion: 1, artifactId: 'art_stage2_form', componentId: 'cmp_platform_stage2_form', kind: 'component', name: 'inventory-form', displayName: 'Inventory Form' };
const formFiles = generateForm(formMetadata, schema);
const form: RuntimeArtifact = { metadata: formMetadata, source: formFiles.source, css: formFiles.css };
const card = packages.find(item => item.tagName === 'uib-card')!;
const source = `<section class="uip-layout-item" data-uip-node="inventory">
<button data-uip-node="refresh">Refresh</button><button data-uip-node="create">New record</button>
<p data-uip-node="loading">Loading inventory…</p><p data-uip-node="empty">No inventory records.</p>
<p data-uip-node="error" role="alert">Inventory request failed. Use Refresh to retry the read.</p><p data-uip-node="denied" role="alert">Inventory access denied.</p>
<uib-card data-uip-node="card" data-uip-component="${card.id}" heading="Inventory record" selectable></uib-card>
<p data-uip-node="selected"></p><p data-uip-node="detail-name"></p><p data-uip-node="detail-quantity"></p><p data-uip-node="detail-active"></p><button data-uip-node="edit">Edit selected record</button><button data-uip-node="delete">Delete selected record</button>
<pre data-uip-node="delete-result"></pre><uip-component data-uip-node="editor" data-uip-component="${formMetadata.componentId}"></uip-component>
</section>`;
let metadata: ArtifactMetadata = { schemaVersion: 1, artifactId: 'art_stage2_inventory', kind: 'page', name: 'inventory', displayName: 'Inventory', state: { inventory: { rows: [] }, detail: { rows: [] }, selectedId: null, operation: 'create', deletion: null }, events: [], bindings: [], conditions: [], repeaters: [] };
let instance: ArtifactInstance | undefined;
let node: string | undefined;
const drafts = new Map<string, {}>();
const controls = document.querySelector<HTMLElement>('#controls')!;
function configure() {
  controls.replaceChildren();
  const label = document.createElement('label'); label.textContent = 'Configure node';
  const select = document.createElement('select'); select.setAttribute('aria-label', 'Configure node');
  for (const id of ['', 'card', 'refresh', 'create', 'edit', 'delete', 'editor', 'selected', 'detail-name', 'detail-quantity', 'detail-active', 'delete-result', 'loading', 'empty', 'error', 'denied']) select.add(new Option(id || 'Page queries and state', id));
  select.value = node ?? ''; select.onchange = () => { node = select.value || undefined; configure(); }; label.append(select); controls.append(label);
  const draft = drafts.get(node ?? '') ?? {}; drafts.set(node ?? '', draft);
  compositionAuthoring(controls, { metadata, node, draft,
    bindingTargets: node === 'editor' ? ['property:operation', 'property:recordId'] : node === 'card' ? ['setting:heading', 'setting:selected'] : ['text'],
    events: node === 'card' ? ['uib-card-select'] : node === 'editor' ? ['submitSucceeded', 'submitFailed'] : ['click'],
    datasets: async () => [{ name: 'Inventory', appliedSchema: schema }],
    change(edit) { const next = structuredClone(metadata); edit(next); metadata = next; configure(); }, refresh: configure,
    error(cause) { const message = document.createElement('p'); message.setAttribute('role', 'alert'); message.textContent = String(cause); controls.append(message); } });
}
async function reload() { metadata = await fetch('/stage2/configuration').then(response => response.json()); configure(); }
function preview() {
  instance?.destroy();
  instance = mountVisualArtifact({ metadata, source, css: 'button{margin:.4rem} uib-card{margin:.5rem;display:block} [role=alert]{color:#a00}' }, { components: [form], packages, services: createApplicationDataServices() });
  document.querySelector('#app')!.replaceChildren(instance.host);
}
document.querySelector('#save')!.addEventListener('click', async () => { const response = await fetch('/stage2/configuration', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ metadata, source }) }); document.querySelector('#identity')!.textContent = response.ok ? 'Configuration saved' : await response.text(); });
document.querySelector('#reload')!.addEventListener('click', () => void reload());
document.querySelector('#preview')!.addEventListener('click', async () => { await reload(); preview(); });
document.querySelector('#login')!.addEventListener('click', async () => {
  const session = await fetch('/api/development-identity/session').then(response => response.json());
  const response = await fetch('/api/development-identity/session', { method: 'POST', headers: { 'content-type': 'application/json', 'x-v1-csrf': session.csrfToken }, body: JSON.stringify({ email: 'admin@example.local' }) });
  document.querySelector('#identity')!.textContent = response.ok ? 'Development admin signed in' : 'Sign-in failed';
});
const saved = await fetch('/stage2/configuration').then(response => response.json());
metadata = { ...metadata, ...saved, state: { ...metadata.state, ...saved.state } }; configure();
