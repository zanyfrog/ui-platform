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
import { mountAppPackages, mountGlobalPackages } from './packages-ui';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing #app root.');

let apps: DiscoveredApp[] = [];
let templates: TemplateDefinition[] = [];
let currentKey: string | null = null;
let keyWasEdited = false;
let currentSearch = '';

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

function icon(name: string): string {
  return `<uib-icon name="${esc(name)}" decorative></uib-icon>`;
}

function appInitial(app: { name?: string; key?: string }): string {
  return String(app.name || app.key || 'A').trim().charAt(0).toUpperCase() || 'A';
}

function appStatusBadge(status: string): string {
  const normalized = String(status || '').toLowerCase();
  return `<span class="status-pill ${normalized === 'active' ? 'status-active' : ''}"><span></span>${esc(status || 'Unknown')}</span>`;
}

function actionButton(action: string, label: string, options: { disabled?: boolean; icon?: string; variant?: 'primary' | 'danger' | 'muted'; type?: 'button' | 'submit' } = {}): string {
  const type = options.type ?? 'button';
  const classes = ['action-button', options.variant ? `action-button-${options.variant}` : ''].filter(Boolean).join(' ');
  return `<button class="${classes}" type="${type}" data-action="${esc(action)}"${options.disabled ? ' disabled' : ''}>${options.icon ? icon(options.icon) : ''}<span>${esc(label)}</span></button>`;
}

function filteredApps(): DiscoveredApp[] {
  const query = currentSearch.trim().toLowerCase();
  if (!query) return apps;
  return apps.filter((app) => [app.name, app.key, app.status].some((value) => String(value ?? '').toLowerCase().includes(query)));
}

function homeAppsMarkup(): string {
  const visibleApps = filteredApps();
  return visibleApps.length ? `<div class="app-tiles">${visibleApps.map(appInfoTile).join('')}</div>` : '<p class="empty-state">No matching applications yet.</p>';
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
      <span class="app-tile-icon">${esc(appInitial(app))}</span>
      <strong>${esc(app.name)}</strong>
      <span>/${esc(app.key)}</span>
      <small>${esc(app.status)} - ${app.valid ? 'ready' : `${app.issues.length} issue${app.issues.length === 1 ? '' : 's'}`}</small>
    </button>
  `;
}

async function refresh(): Promise<void> {
  [apps, templates] = await Promise.all([api<DiscoveredApp[]>('/api/apps'), api<TemplateDefinition[]>('/api/templates')]);
}

function sidebar(): string {
  return `
    <aside class="sidebar-shell">
      <button class="brand-lockup" type="button" data-action="home" aria-label="Modular UI Platform home">
        <span class="brand-mark">M</span>
        <span><small>MODULAR</small><strong>UI Platform</strong></span>
      </button>
      <uib-menu class="side-menu" label="Platform navigation" open breakpoint="1px">
        <uib-menuitem name="applications" active data-action="home">${icon('menu')}<span>Applications</span></uib-menuitem>
        <uib-menuitem name="packages" data-action="packages">${icon('info')}<span>Packages</span></uib-menuitem>
        <uib-menuitem name="templates" disabled>${icon('calendar')}<span>Templates</span></uib-menuitem>
        <uib-menuitem name="settings" disabled>${icon('chevron-down')}<span>Settings</span></uib-menuitem>
      </uib-menu>
      <div class="sidebar-user">
        <span class="user-avatar">U</span>
        <span><strong>User</strong><small>user@example.com</small></span>
        ${icon('chevron-down')}
      </div>
    </aside>`;
}

function shell(content: string): void {
  root!.innerHTML = `
    <main class="shell">
      ${sidebar()}
      <section class="workspace">
        <header class="topbar">
          <uib-forms-textbox class="global-search" name="applicationSearch" label="Search applications" placeholder="Search applications..." value="${esc(currentSearch)}"></uib-forms-textbox>
          ${actionButton('new', 'New Application', { variant: 'primary' })}
        </header>
        ${content}
      </section>
    </main>`;
  bindCommon();
}

function bindCommon(): void {
  root!.querySelector('[data-action="new"]')?.addEventListener('click', renderCreate);
  root!.querySelector('[data-action="home"]')?.addEventListener('click', () => renderHome());
  root!.querySelector('[data-action="packages"]')?.addEventListener('click', () => renderPackages());
  root!.querySelector('uib-menu.side-menu')?.addEventListener('uib-menuitem-select', (event) => {
    const target = event.target as HTMLElement;
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'home') renderHome();
    if (action === 'packages') renderPackages();
  });
  root!.querySelector<HTMLElement>('.global-search')?.addEventListener('input', (event) => {
    const detail = (event as unknown as CustomEvent).detail as { newValue?: unknown } | undefined;
    currentSearch = String(detail?.newValue ?? (event.target as any).value ?? '');
    if (!currentKey) {
      const region = root!.querySelector<HTMLElement>('#appTilesRegion');
      if (region) {
        region.innerHTML = homeAppsMarkup();
        bindAppRows();
      }
    }
  });
  bindAppRows();
}

function bindAppRows(): void {
  root!.querySelectorAll<HTMLElement>('[data-app]').forEach((el) => el.addEventListener('click', () => void renderApp(el.dataset.app!)));
}

function renderHome(updateUrl = true): void {
  currentKey = null;
  if (updateUrl && window.location.pathname !== '/') window.history.pushState({}, '', '/');
  const appTiles = homeAppsMarkup();
  shell(`
    <div class="breadcrumb"><button type="button" data-action="home">Applications</button></div>
    <uib-panel class="content-panel home-panel" heading="Applications">
      <p class="note">Select an application or create a new one. Valid folders copied manually into <code>Modular/apps/</code> are discovered automatically.</p>
      <div id="appTilesRegion">${appTiles}</div>
    </uib-panel>`);
  void loadAppInfoComponents();
}

function renderPackages(updateUrl = true): void {
  currentKey = null;
  if (updateUrl && window.location.pathname !== '/packages') window.history.pushState({}, '', '/packages');
  shell(`
    <div class="breadcrumb"><button type="button" data-action="home">Applications</button><span>/</span><strong>Packages</strong></div>
    <uib-panel class="content-panel" heading="Packages">
      <div id="packagesTarget"></div>
    </uib-panel>`);
  void mountGlobalPackages(root!.querySelector<HTMLElement>('#packagesTarget')!);
}

function renderCreate(): void {
  currentKey = null; keyWasEdited = false;
  const templateField = templates.length === 1
    ? `<uib-forms-display-field label="Template" display-value="${esc(templates[0].name)}"></uib-forms-display-field><input type="hidden" name="templateId" value="${esc(templates[0].id)}" />`
    : `<uib-forms-select id="templateId" name="templateId" label="Template" required options="${esc(templates.map(t => t.id).join(','))}"></uib-forms-select>`;
  shell(`
    <div class="breadcrumb"><button type="button" data-action="home">Applications</button><span>/</span><strong>New Application</strong></div>
    <form id="createForm">
      <uib-panel class="content-panel form-panel" heading="Create Application">
        <p class="note">Only the required creation fields are shown here. After creation, all persistent settings are displayed.</p>
        <div class="settings-grid">
          <uib-forms-textbox id="appName" name="name" label="Application Name" required></uib-forms-textbox>
          <uib-forms-textbox id="appKey" name="key" label="URL / Folder Name" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required help="Permanent after creation. This becomes the default URL."></uib-forms-textbox>
          ${templateField}
        </div>
        <div class="actions">
          ${actionButton('create', 'Create', { variant: 'primary', type: 'submit' })}
          ${actionButton('cancel', 'Cancel', { variant: 'muted' })}
        </div>
        <div id="createError"></div>
      </uib-panel>
    </form>`);
  const form = root!.querySelector<HTMLFormElement>('#createForm')!;
  const name = root!.querySelector<any>('#appName')!;
  const key = root!.querySelector<any>('#appKey')!;
  name.addEventListener('input', () => { if (!keyWasEdited) key.value = slug(name.value); });
  key.addEventListener('input', () => { keyWasEdited = true; });
  root!.querySelector('[data-action="cancel"]')?.addEventListener('click', () => renderHome());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    button.disabled = true; button.querySelector('span')!.textContent = 'Creating / installing...';
    try {
      const templateControl = form.querySelector<any>('[name="templateId"]');
      const templateId = templateControl?.value;
      const created = await api<DiscoveredApp>('/api/apps', { method:'POST', body:JSON.stringify({ name:name.value, key:key.value, templateId }) });
      await refresh();
      await renderApp(created.key, true);
    } catch (error) {
      root!.querySelector('#createError')!.innerHTML = `<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`;
      button.disabled = false; button.querySelector('span')!.textContent = 'Create';
    }
  });
}

function settingControl(def: TemplateSettingDefinition, settings: any): string {
  const value = getPath(settings, def.path);
  const common = `data-setting="${esc(def.path)}" name="${esc(def.path)}" label="${esc(def.label)}" ${def.required?'required':''} ${def.help ? `help="${esc(def.help)}"` : ''}`;
  if (def.type === 'boolean') return `<uib-checkbox ${common} ${value ? 'checked':''}></uib-checkbox>`;
  if (def.type === 'select') return `<uib-forms-select ${common} value="${esc(value ?? '')}" options="${esc((def.options ?? []).join(','))}"></uib-forms-select>`;
  if (def.type === 'multiline') return `<uib-forms-textarea ${common} value="${esc(value ?? '')}"></uib-forms-textarea>`;
  if (def.type === 'email') return `<uib-forms-email ${common} value="${esc(value ?? '')}"></uib-forms-email>`;
  if (def.type === 'number') return `<uib-forms-number ${common} value="${esc(value ?? '')}"></uib-forms-number>`;
  return `<uib-forms-textbox ${common} value="${esc(value ?? '')}"></uib-forms-textbox>`;
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
  shell(`
    <div class="breadcrumb"><button type="button" data-action="home">Applications</button><span>/</span><strong>${esc(app.name)}</strong></div>
    <section class="app-hero">
      <div class="app-icon">${esc(appInitial(app))}</div>
      <div class="app-summary">
        <div class="app-title-row"><h1>${esc(app.name)}</h1>${appStatusBadge(app.status)}</div>
        <p><span>/${esc(app.key)}</span><span class="app-id">${icon('info')}${esc(app.appId)}</span></p>
        <p>${esc(app.settings?.description ?? 'A sample application built with the UI Platform.')}</p>
      </div>
      <button class="icon-button" type="button" aria-label="More application actions">${icon('menu')}</button>
    </section>
    ${app.valid?'':`<div class="error">${app.issues.map((x:string)=>esc(x)).join('<br>')}</div>`}
    <uib-tabs class="app-tabs" selected="0">
      <uib-tab>${icon('info')}<span>Overview</span></uib-tab>
      <uib-tab>${icon('calendar')}<span>Pages</span></uib-tab>
      <uib-tab>${icon('info')}<span>Packages</span></uib-tab>
      <uib-tab>${icon('external-link')}<span>Preview</span></uib-tab>
      <uib-tab>${icon('chevron-down')}<span>Settings</span></uib-tab>
      <uib-tab-panel>
        <form id="settingsForm">
          <uib-panel class="content-panel details-panel" heading="Application Details">
            <button class="edit-button" slot="actions" type="button">${icon('info')}<span>Edit</span></button>
            <div class="settings-grid">${controls}</div>
            <div class="actions">
              ${actionButton('save', 'Save Changes', { disabled: true, variant: 'primary', icon: 'check', type: 'submit' })}
              ${actionButton('preview', 'Current Preview', { variant: 'muted', icon: 'external-link' })}
              ${actionButton('export', 'Export ZIP', { variant: 'muted', icon: 'external-link' })}
              ${actionButton('delete', 'Delete to OS Trash', { variant: 'danger', icon: 'x' })}
            </div>
            <p class="note">Folder/URL name is immutable. Pages: ${app.pages.map((r:string)=>`<code>${esc(r)}</code>`).join(', ') || 'none'}</p>
            <div id="appMessage"></div>
          </uib-panel>
        </form>
      </uib-tab-panel>
      <uib-tab-panel><div id="builderTarget"></div></uib-tab-panel>
      <uib-tab-panel><div id="appPackagesTarget"></div></uib-tab-panel>
      <uib-tab-panel>
        <uib-panel class="content-panel" heading="Current Preview">
          <div id="previewTarget"><p class="note">Click Current Preview to start this app through the platform-managed preview runtime.</p></div>
        </uib-panel>
      </uib-tab-panel>
      <uib-tab-panel>
        <uib-panel class="content-panel" heading="Application Settings">
          <p class="note">Persistent template settings are edited in Overview. Package and page tools live in their own tabs.</p>
        </uib-panel>
      </uib-tab-panel>
    </uib-tabs>`);
  void mountBuilder(root!.querySelector<HTMLElement>('#builderTarget')!, { key: app.key, name: app.name });
  void mountAppPackages(root!.querySelector<HTMLElement>('#appPackagesTarget')!, app.key);

  const form = root!.querySelector<HTMLFormElement>('#settingsForm')!;
  const saveButton = form.querySelector<HTMLButtonElement>('[data-action="save"]')!;
  let lastSavedSettings = JSON.stringify(app.settings);
  let settingsDirty = false;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let saveInFlight: Promise<boolean> | null = null;
  const readSettings = () => {
    const next = structuredClone(app.settings);
    root!.querySelectorAll<any>('[data-setting]').forEach((el) => setPath(next, el.dataset.setting!, el.localName === 'uib-checkbox' ? Boolean(el.checked) : el.localName === 'uib-forms-number' ? Number(el.value) : el.value));
    return next;
  };
  const updateSaveButton = () => { saveButton.disabled = !settingsDirty || Boolean(saveInFlight); };
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveTimer = undefined; void saveSettings(true); }, 2000);
  };
  const markSettingsDirty = () => {
    settingsDirty = JSON.stringify(readSettings()) !== lastSavedSettings;
    updateSaveButton();
    if (settingsDirty) scheduleSave();
    else if (saveTimer) { clearTimeout(saveTimer); saveTimer = undefined; }
  };
  const saveSettings = async (automatic = false): Promise<boolean> => {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = undefined; }
    if (saveInFlight) return saveInFlight;
    if (!settingsDirty) return true;
    const next = readSettings();
    const savedSettings = JSON.stringify(next);
    updateSaveButton();
    saveInFlight = (async () => {
      try {
        const updated = await api<any>(`/api/apps/${encodeURIComponent(key)}/settings`, { method:'PUT', body:JSON.stringify(next) });
        app.settings = updated.settings ?? next;
        lastSavedSettings = savedSettings;
        await refresh();
        root!.querySelector('#appMessage')!.innerHTML = `<p>${automatic ? 'Changes saved automatically.' : 'Changes saved.'}</p>`;
        settingsDirty = JSON.stringify(readSettings()) !== lastSavedSettings;
        return true;
      } catch(error) {
        root!.querySelector('#appMessage')!.innerHTML=`<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`;
        settingsDirty = true;
        return false;
      } finally {
        saveInFlight = null;
        updateSaveButton();
      }
    })();
    return saveInFlight;
  };
  form.addEventListener('submit', (event) => { event.preventDefault(); void saveSettings(); });
  form.addEventListener('input', markSettingsDirty);
  form.addEventListener('change', markSettingsDirty);

  const tabs = root!.querySelector<any>('uib-tabs.app-tabs')!;
  let previewStarted = false;
  let previewStarting = false;
  const preview = async () => {
    if (previewStarting) return;
    const refreshPreview = settingsDirty || Boolean(saveInFlight) || Boolean(saveTimer);
    previewStarting = true;
    const target = root!.querySelector('#previewTarget')!;
    try {
      if (!(await saveSettings())) { target.innerHTML = '<div class="error">Preview was not started because changes could not be saved.</div>'; return; }
      if (previewStarted && !refreshPreview) return;
      target.innerHTML = '<p class="note">Starting preview...</p>';
      const previewInfo = await api<{url:string}>(`/api/apps/${encodeURIComponent(key)}/preview`, { method:'POST' });
      const previewUrl = new URL(previewInfo.url);
      previewUrl.searchParams.set('platform-preview', String(Date.now()));
      target.innerHTML = `<iframe class="preview-frame" src="${esc(previewUrl.toString())}" title="${esc(app.name)} preview"></iframe>`;
      previewStarted = true;
    }
    catch(error) { target.innerHTML=`<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`; }
    finally { previewStarting = false; }
  };
  tabs.addEventListener('uib-tabs-change', (event: Event) => {
    if (Number((event as CustomEvent<{ newValue?: number }>).detail?.newValue) === 3) void preview();
  });
  root!.querySelector('[data-action="preview"]')?.addEventListener('click', () => {
    tabs.selected = '3';
    void preview();
  });
  root!.querySelector('[data-action="export"]')?.addEventListener('click', async () => {
    try { const out = await api<{url:string;downloadName:string}>(`/api/apps/${encodeURIComponent(key)}/export`, { method:'POST' }); const a=document.createElement('a'); a.href=out.url; a.download=out.downloadName; a.click(); }
    catch(error) { alert(error instanceof Error ? error.message : String(error)); }
  });
  root!.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
    if (!confirm(`Move ${app.name} to the operating system Trash/Recycle Bin?`)) return;
    try { await api(`/api/apps/${encodeURIComponent(key)}`, { method:'DELETE' }); currentKey=null; await refresh(); renderHome(); }
    catch(error) { alert(error instanceof Error ? error.message : String(error)); }
  });
  if (startPreview) {
    tabs.selected = '3';
    void preview();
  }
}

await refresh();
if (window.location.pathname === '/packages') renderPackages(false);
else renderHome(false);
window.addEventListener('popstate', () => {
  if (window.location.pathname === '/packages') renderPackages(false);
  else renderHome(false);
});
const events = new EventSource('/api/events');
events.addEventListener('workspace-change', async () => {
  await refresh();
  document.dispatchEvent(new CustomEvent('ui-platform-workspace-change'));
  if (!currentKey) renderHome();
  // If a detail screen is open, leave current unsaved inputs alone; Vite preview itself handles source HMR.
});
