import '@ui-base/core/styles.css';
import '@ui-base/design-system/styles.css';
import '@ui-base/theme/styles.css';
import '@ui-base/icons';
import '@ui-base/ui/styles.css';
import '@ui-base/ui';
import '@ui-base/forms';
import '@ui-base/calendar';
import '@ui-base/hero';
import '@ui-base/tour-ui';
import '@ui-base/assets';
import '@ui-base/ui-layout';
import './styles.css';
import type { DiscoveredApp, TemplateDefinition, TemplateSettingDefinition } from '../shared/types';
import { mountBuilder } from './builder';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing #app root.');

let apps: DiscoveredApp[] = [];
let templates: TemplateDefinition[] = [];
let currentKey: string | null = null;
let keyWasEdited = false;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) }, ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? `Request failed: ${response.status}`);
  return payload as T;
}

function esc(value: unknown): string {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}
function slug(value: string): string { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function getPath(obj: any, path: string): any { return path.split('.').reduce((value, part) => value?.[part], obj); }
function setPath(obj: any, path: string, value: any): void {
  const parts = path.split('.'); let current = obj;
  for (const part of parts.slice(0,-1)) current = current[part] ??= {};
  current[parts.at(-1)!] = value;
}

function validCustomElementName(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z][a-z0-9.-]*-[a-z0-9.-]*$/.test(value);
}

async function loadAppInfoComponents(): Promise<void> {
  await Promise.all(apps.map(async (app) => {
    const component = app.appServices?.components?.appInfo;
    if (!component?.bundle || !validCustomElementName(component.tag) || customElements.get(component.tag)) return;
    await import(/* @vite-ignore */ component.bundle);
  }));
}

function appInfoTile(app: DiscoveredApp): string {
  const component = app.appServices?.components?.appInfo;
  if (component?.bundle && validCustomElementName(component.tag)) {
    return `
      <div class="app-tile app-info-tile">
        <${component.tag} info-url="/api/apps/${esc(app.key)}/info?origin=${esc(encodeURIComponent(window.location.origin))}"></${component.tag}>
        <button class="tile-action" data-app="${esc(app.key)}">Manage</button>
      </div>
    `;
  }

  return `
    <button class="app-tile" data-app="${esc(app.key)}">
      <strong>${esc(app.name)}</strong>
      <span>/${esc(app.key)}</span>
      <small>${esc(app.status)} · ${app.valid ? 'ready' : `${app.issues.length} issue${app.issues.length === 1 ? '' : 's'}`}</small>
    </button>
  `;
}

async function refresh(): Promise<void> {
  [apps, templates] = await Promise.all([api<DiscoveredApp[]>('/api/apps'), api<TemplateDefinition[]>('/api/templates')]);
}

function sidebar(): string {
  return `
    <section class="panel stack">
      <uib-heading text="Applications" level="2" size="compact"></uib-heading>
      <button class="primary" data-action="new">+ Create Application</button>
      <div class="app-list">
        ${apps.map((app) => `<button class="app-row" data-app="${esc(app.key)}"><strong>${esc(app.name)}</strong><small>/${esc(app.key)} · ${esc(app.status)}</small></button>`).join('') || '<p class="note">No applications yet.</p>'}
      </div>
    </section>`;
}

function shell(content: string): void {
  root!.innerHTML = `<main class="shell"><header class="topbar"><uib-heading-block eyebrow="Modular" headline="UI Platform" subheadline="Create, discover, preview, configure, export, and remove portable TypeScript applications."></uib-heading-block></header><div class="grid">${sidebar()}<section>${content}</section></div></main>`;
  bindCommon();
}

function bindCommon(): void {
  root!.querySelector('[data-action="new"]')?.addEventListener('click', renderCreate);
  root!.querySelectorAll<HTMLElement>('[data-app]').forEach((el) => el.addEventListener('click', () => void renderApp(el.dataset.app!)));
}

function renderHome(): void {
  currentKey = null;
  const appTiles = apps.map(appInfoTile).join('');
  shell(`<div class="panel stack"><uib-heading text="Application Workspace" level="2"></uib-heading><p>Select an application or create a new one. Valid folders copied manually into <code>Modular/apps/</code> are discovered automatically.</p><p class="note">Version 1 uses one auto-discovered template: Standard Application.</p>${apps.length ? `<div class="app-tiles">${appTiles}</div>` : '<p class="note">No applications yet.</p>'}</div>`);
  void loadAppInfoComponents();
}

function renderCreate(): void {
  currentKey = null; keyWasEdited = false;
  const templateField = templates.length === 1
    ? `<div class="field"><span class="field-label">Template</span><div class="readonly-value">${esc(templates[0].name)}</div><input type="hidden" name="templateId" value="${esc(templates[0].id)}" /></div>`
    : `<div class="field"><label for="templateId">Template *</label><select id="templateId" name="templateId" required>${templates.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select></div>`;
  shell(`<form id="createForm" class="panel stack"><uib-heading text="Create Application" level="2"></uib-heading><p class="note">Only the required creation fields are shown here. After creation, all persistent settings are displayed.</p><div class="field"><label for="appName">Application Name *</label><input id="appName" name="name" required /></div><div class="field"><label for="appKey">URL / Folder Name *</label><input id="appKey" name="key" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /><small class="note">Permanent after creation. This becomes the default URL.</small></div>${templateField}<div class="actions"><button class="primary" type="submit">Create</button><button type="button" data-action="cancel">Cancel</button></div><div id="createError"></div></form>`);
  const form = root!.querySelector<HTMLFormElement>('#createForm')!;
  const name = root!.querySelector<HTMLInputElement>('#appName')!;
  const key = root!.querySelector<HTMLInputElement>('#appKey')!;
  name.addEventListener('input', () => { if (!keyWasEdited) key.value = slug(name.value); });
  key.addEventListener('input', () => { keyWasEdited = true; });
  root!.querySelector('[data-action="cancel"]')?.addEventListener('click', renderHome);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    button.disabled = true; button.textContent = 'Creating / installing…';
    try {
      const templateId = (form.elements.namedItem('templateId') as HTMLInputElement | HTMLSelectElement | null)?.value;
      const created = await api<DiscoveredApp>('/api/apps', { method:'POST', body:JSON.stringify({ name:name.value, key:key.value, templateId }) });
      await refresh();
      await renderApp(created.key, true);
    } catch (error) {
      root!.querySelector('#createError')!.innerHTML = `<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`;
      button.disabled = false; button.textContent = 'Create';
    }
  });
}

function settingControl(def: TemplateSettingDefinition, settings: any): string {
  const value = getPath(settings, def.path);
  const common = `data-setting="${esc(def.path)}"`;
  if (def.type === 'boolean') return `<div class="field"><label><input type="checkbox" ${common} ${value ? 'checked':''}/> ${esc(def.label)}</label>${def.help ? `<small class="note">${esc(def.help)}</small>`:''}</div>`;
  if (def.type === 'select') return `<div class="field"><label>${esc(def.label)}</label><select ${common}>${(def.options ?? []).map(o => `<option value="${esc(o)}" ${o===value?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`;
  if (def.type === 'multiline') return `<div class="field"><label>${esc(def.label)}</label><textarea rows="4" ${common}>${esc(value ?? '')}</textarea></div>`;
  return `<div class="field"><label>${esc(def.label)}</label><input type="${def.type === 'email' ? 'email' : def.type === 'url' ? 'url' : def.type === 'number' ? 'number' : 'text'}" value="${esc(value ?? '')}" ${common} ${def.required?'required':''}/>${def.help ? `<small class="note">${esc(def.help)}</small>`:''}</div>`;
}

async function renderApp(key: string, startPreview = false): Promise<void> {
  currentKey = key;
  const app = await api<any>(`/api/apps/${encodeURIComponent(key)}`);
  const defs: TemplateSettingDefinition[] = app.templateDefinition?.settings ?? [];
  let group = '';
  const controls = defs.map((def) => {
    const header = def.group && def.group !== group ? (group = def.group, `<div class="group">${esc(group)}</div>`) : '';
    return header + settingControl(def, app.settings);
  }).join('');
  shell(`<div class="stack"><section class="panel stack"><div><uib-heading text="${esc(app.name)}" level="2"></uib-heading><span class="badge">/${esc(app.key)}</span> <span class="badge">${esc(app.status)}</span> <span class="badge">${esc(app.appId)}</span></div>${app.valid?'':`<div class="error">${app.issues.map((x:string)=>esc(x)).join('<br>')}</div>`}<form id="settingsForm"><div class="settings-grid">${controls}</div><div class="actions" style="margin-top:1rem"><button class="primary" type="submit">Save Settings</button><button type="button" data-action="preview">Current Preview</button><button type="button" data-action="export">Export ZIP</button><button class="danger" type="button" data-action="delete">Delete to OS Trash</button></div></form><p class="note">Folder/URL name is immutable. Pages: ${app.pages.map((r:string)=>`<code>${esc(r)}</code>`).join(', ') || 'none'}</p><div id="appMessage"></div></section><section class="panel stack"><uib-heading text="Current Preview" level="2" size="compact"></uib-heading><div id="previewTarget"><p class="note">Click Current Preview to start this app through the platform-managed preview runtime.</p></div></section><div id="builderTarget"></div></div>`);
  void mountBuilder(root!.querySelector<HTMLElement>('#builderTarget')!, { key: app.key, name: app.name });

  root!.querySelector<HTMLFormElement>('#settingsForm')!.addEventListener('submit', async (event) => {
    event.preventDefault();
    const next = structuredClone(app.settings);
    root!.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('[data-setting]').forEach((el) => setPath(next, el.dataset.setting!, el instanceof HTMLInputElement && el.type==='checkbox' ? el.checked : el instanceof HTMLInputElement && el.type==='number' ? Number(el.value) : el.value));
    try { await api(`/api/apps/${encodeURIComponent(key)}/settings`, { method:'PUT', body:JSON.stringify(next) }); root!.querySelector('#appMessage')!.innerHTML='<p>Settings saved.</p>'; await refresh(); }
    catch(error) { root!.querySelector('#appMessage')!.innerHTML=`<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`; }
  });

  const preview = async () => {
    const target = root!.querySelector('#previewTarget')!;
    target.innerHTML = '<p class="note">Starting preview…</p>';
    try { await api<{url:string}>(`/api/apps/${encodeURIComponent(key)}/preview`, { method:'POST' }); target.innerHTML = `<iframe class="preview-frame" src="/${esc(app.key)}/" title="${esc(app.name)} preview"></iframe>`; }
    catch(error) { target.innerHTML=`<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`; }
  };
  root!.querySelector('[data-action="preview"]')?.addEventListener('click', () => void preview());
  root!.querySelector('[data-action="export"]')?.addEventListener('click', async () => {
    try { const out = await api<{url:string;downloadName:string}>(`/api/apps/${encodeURIComponent(key)}/export`, { method:'POST' }); const a=document.createElement('a'); a.href=out.url; a.download=out.downloadName; a.click(); }
    catch(error) { alert(error instanceof Error ? error.message : String(error)); }
  });
  root!.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
    if (!confirm(`Move ${app.name} to the operating system Trash/Recycle Bin?`)) return;
    try { await api(`/api/apps/${encodeURIComponent(key)}`, { method:'DELETE' }); currentKey=null; await refresh(); renderHome(); }
    catch(error) { alert(error instanceof Error ? error.message : String(error)); }
  });
  if (startPreview) void preview();
}

await refresh();
renderHome();
const events = new EventSource('/api/events');
events.addEventListener('workspace-change', async () => {
  await refresh();
  document.dispatchEvent(new CustomEvent('ui-platform-workspace-change'));
  if (!currentKey) renderHome();
  // If a detail screen is open, leave current unsaved inputs alone; Vite preview itself handles source HMR.
});
