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

let artifactEditorMounted = false;
if (import.meta.env.DEV) {
  const { mountDevelopmentIdentity } = await import('./artifact-editor/identity-selector');
  const identityHeader = document.createElement('div');
  identityHeader.className = 'development-identity';
  root.before(identityHeader);
  await mountDevelopmentIdentity(identityHeader);
  const { editorSessionSnapshot } = await import('./artifact-editor/session');
  if (editorSessionSnapshot()) {
    const { mountArtifactEditor } = await import('./artifact-editor/shell');
    await import('./artifact-editor/editor.css');
    mountArtifactEditor(root);
    artifactEditorMounted = true;
  }
}

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

async function mountPresentation(target: HTMLElement, key: string): Promise<void> {
  const endpoint = `/api/apps/${encodeURIComponent(key)}/presentation`;
  try {
    const status = await api<any>(endpoint);
    if (!status.initialized) {
      target.innerHTML = `<section class="presentation-empty"><div><span class="presentation-orb">${icon('calendar')}</span><h2>Establish your application presentation</h2><p>Set shared styling, assets, and application-wide display defaults. Nothing changes in the app until you publish.</p></div>${actionButton('presentation-initialize', 'Initialize Presentation', { variant: 'primary' })}</section>`;
      target.querySelector('[data-action="presentation-initialize"]')?.addEventListener('click', async () => { await api(`${endpoint}/initialize`, { method: 'POST' }); await mountPresentation(target, key); });
      return;
    }
    const draft = status.draft;
    const colors = Object.entries(draft.tokens).filter(([name]) => name.includes('color')).slice(0, 6);
    const active = status.manifest.activeVersion === null ? 'Draft only' : `v${status.manifest.activeVersion} active`;
    target.innerHTML = `<section class="presentation-overview">
      <header class="presentation-header"><div><h2>Presentation</h2><p>Manage the visual design, layout, and presentation settings for this application.</p></div><div class="presentation-actions"><span class="presentation-version">${esc(active)}</span><span class="presentation-published">${status.manifest.versions.at(-1)?.publishedAt ? `Published ${esc(new Date(status.manifest.versions.at(-1).publishedAt).toLocaleString())}` : 'Not published yet'}</span>${actionButton('presentation-publish', 'Publish Changes', { variant: 'primary' })}</div></header>
      <div class="presentation-grid"><div class="presentation-sections">
        <article class="presentation-card"><button class="presentation-card-heading" data-presentation-edit="styling"><span class="presentation-orb">${icon('calendar')}</span><span><strong>Styling</strong><small>Customize your brand, colors, typography, and visual style.</small></span><b>›</b></button><div class="presentation-card-body styling-summary"><div><strong>Brand Colors</strong><span class="color-swatches">${colors.map(([, value]) => `<i style="background:${esc(value)}"></i>`).join('') || '<em>No colors yet</em>'}</span></div><div><strong>Typography</strong><span class="type-sample">Aa</span><small>${esc(draft.typography['--app-font-body'] ?? draft.tokens['--app-font-body'] ?? 'System')}</small></div><button type="button" data-presentation-edit="styling"><strong>Design Tokens & CSS</strong><small>${Object.keys(draft.tokens).length} tokens · ${draft.css.trim() ? 'custom CSS' : 'no custom CSS'}</small></button></div></article>
        <article class="presentation-card"><button class="presentation-card-heading" data-presentation-layout><span class="presentation-orb">${icon('calendar')}</span><span><strong>Layout &amp; Structure</strong><small>Shared shell/template runtime and route-derived navigation are active.</small></span><b>›</b></button><div class="presentation-card-body structure-summary">${[['Application Shell',`${draft.layout.defaultShell} is the default shell.`],['Navigation','Generated from application routes.'],['Heroes','Reusable hero editor is next.'],['Page Templates',`${draft.layout.defaultTemplate} is the default template.`]].map(([title, detail], index) => `<div><strong>${title}</strong><small>${detail}</small><em>${index < 2 ? 'Active default' : 'Next phase'}</em></div>`).join('')}</div></article>
        <article class="presentation-card"><button class="presentation-card-heading" data-presentation-assets><span class="presentation-orb">${icon('info')}</span><span><strong>Assets</strong><small>Manage logos, images, icons, and other brand assets.</small></span><b>›</b></button><div class="presentation-card-body asset-summary">${draft.assets.length ? draft.assets.slice(0, 4).map((asset: any) => `<div class="asset-chip"><strong>${esc(asset.name)}</strong><small>${esc(asset.type)}</small><button type="button" data-remove-asset="${esc(asset.id)}" aria-label="Remove ${esc(asset.name)}">×</button></div>`).join('') : '<p class="note">No local assets yet.</p>'}<button type="button" class="asset-upload-button" data-presentation-assets>＋ Upload asset</button></div></article>
      </div><aside class="presentation-preview"><div class="preview-heading"><span class="presentation-orb">${icon('external-link')}</span><span><strong>Preview</strong><small>See how your draft changes look in the application.</small></span></div><div class="preview-modes"><button data-preview-mode="desktop" class="is-selected">Desktop</button><button data-preview-mode="tablet">Tablet</button><button data-preview-mode="mobile">Mobile</button></div><div class="presentation-preview-canvas"><p>Starting draft preview…</p></div><p class="draft-note">Your changes are saved as a draft until you publish.</p></aside></div></section>`;
    target.querySelector('[data-action="presentation-publish"]')?.addEventListener('click', async () => { await api(`${endpoint}/publish`, { method: 'POST' }); await mountPresentation(target, key); });
    target.querySelectorAll('[data-presentation-edit]').forEach((button) => button.addEventListener('click', () => void mountPresentationEditor(target, key)));
    target.querySelectorAll('[data-presentation-layout]').forEach((button) => button.addEventListener('click', () => void mountPresentationLayout(target, key)));
    target.querySelectorAll('[data-presentation-assets]').forEach((button) => button.addEventListener('click', () => void mountPresentationAssets(target, key)));
    target.querySelectorAll<HTMLButtonElement>('[data-remove-asset]').forEach((button) => button.addEventListener('click', async () => { if (!confirm('Remove this local asset?')) return; await api(`${endpoint}/assets/${encodeURIComponent(button.dataset.removeAsset!)}`, { method: 'DELETE' }); await mountPresentation(target, key); }));
    const canvas = target.querySelector<HTMLElement>('.presentation-preview-canvas')!;
    const preview = async (mode: string) => {
      canvas.className = `presentation-preview-canvas mode-${mode}`;
      const started = await api<{ url: string }>(`/api/apps/${encodeURIComponent(key)}/preview`, { method: 'POST' });
      const url = new URL(started.url); url.searchParams.set('ui-presentation-draft-css', new URL(`${endpoint}/draft.css`, window.location.origin).toString());
      canvas.innerHTML = `<iframe class="presentation-preview-frame" title="${esc(draft.name)} ${esc(mode)} preview" src="${esc(url.toString())}"></iframe>`;
    };
    target.querySelectorAll<HTMLButtonElement>('[data-preview-mode]').forEach((button) => button.addEventListener('click', () => { target.querySelectorAll('[data-preview-mode]').forEach((item) => item.classList.toggle('is-selected', item === button)); void preview(button.dataset.previewMode!); }));
    void preview('desktop');
  } catch (error) { target.innerHTML = `<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`; }
}

async function mountPresentationAssets(target: HTMLElement, key: string): Promise<void> {
  const endpoint = `/api/apps/${encodeURIComponent(key)}/presentation`;
  target.innerHTML = `<section class="presentation-editor"><button type="button" class="back-link" data-presentation-back>‹ Presentation overview</button><h2>Assets</h2><p class="note">Assets stay with this application and are portable when it is exported.</p><form id="assetUploadForm" class="asset-upload-form"><label>Asset ID<input name="id" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="brand-logo"></label><label>Name<input name="name" required placeholder="Brand logo"></label><label>Type<select name="type"><option value="logo">Logo</option><option value="image">Image</option><option value="icon">Icon</option><option value="illustration">Illustration</option><option value="background">Background</option><option value="favicon">Favicon</option><option value="other">Other</option></select></label><label>Alt text<input name="alt" placeholder="Company logo"></label><label>File<input name="asset" type="file" required></label>${actionButton('asset-upload', 'Upload asset', { variant: 'primary', type: 'submit' })}<div id="assetUploadMessage"></div></form></section>`;
  target.querySelector('[data-presentation-back]')?.addEventListener('click', () => void mountPresentation(target, key));
  target.querySelector<HTMLFormElement>('#assetUploadForm')?.addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget as HTMLFormElement; try { await fetch(`${endpoint}/assets`, { method: 'POST', body: new FormData(form) }).then(async (response) => { if (!response.ok) throw new Error((await response.json()).error ?? 'Upload failed.'); }); await mountPresentation(target, key); } catch (error) { target.querySelector('#assetUploadMessage')!.innerHTML = `<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`; } });
}

async function mountPresentationLayout(target: HTMLElement, key: string): Promise<void> {
  const endpoint = `/api/apps/${encodeURIComponent(key)}/presentation`;
  const [status, app] = await Promise.all([api<any>(endpoint), api<any>(`/api/apps/${encodeURIComponent(key)}`)]);
  const draft = status.draft; const layout = draft.layout;
  const options = (values: string[], selected: string) => values.map((value) => `<option value="${value}"${value === selected ? ' selected' : ''}>${value.replace(/-/g, ' ')}</option>`).join('');
  const configured = new Map<string, any>(layout.navigation.map((item: any) => [item.route, item]));
  target.innerHTML = `<section class="presentation-editor layout-editor"><button type="button" class="back-link" data-presentation-back>‹ Presentation overview</button><h2>Layout &amp; Structure</h2><p class="note">These defaults wrap existing page content without changing page source files.</p><form id="presentationLayoutForm" class="stack"><div class="presentation-quick-fields"><label>Default shell<select name="defaultShell">${options(['public','authenticated','minimal'], layout.defaultShell)}</select></label><label>Default template<select name="defaultTemplate">${options(['standard','two-column','dashboard','form','detail-record'], layout.defaultTemplate)}</select></label></div><h3>Shells</h3><div class="shell-settings">${(['public','authenticated','minimal'] as const).map((shell) => { const settings = layout.shells[shell]; return `<fieldset><legend>${shell}</legend><label>Logo asset ID<input name="${shell}-logo" value="${esc(settings.logoAssetId ?? '')}" placeholder="brand-logo"></label><label><input type="checkbox" name="${shell}-navigation"${settings.showNavigation ? ' checked' : ''}> Show navigation</label><label>Navigation placement<select name="${shell}-placement">${options(['top','side'], settings.navigationPlacement)}</select></label><label><input type="checkbox" name="${shell}-footer"${settings.showFooter ? ' checked' : ''}> Show footer</label><label>Footer text<input name="${shell}-footerText" value="${esc(settings.footerText)}"></label></fieldset>`; }).join('')}</div><h3>Route navigation and overrides</h3><div class="route-layout-list">${app.pages.map((route: string, index: number) => { const item: any = configured.get(route) ?? {}; const assignment = layout.routes[route] ?? {}; return `<fieldset><legend>${esc(route)}</legend><label>Label<input name="route-${index}-label" value="${esc(item.label ?? (route === '/' ? 'Home' : route.split('/').filter(Boolean).join(' ')))}"></label><label>Icon<input name="route-${index}-icon" value="${esc(item.icon ?? '')}" placeholder="semantic icon"></label><label>Order<input name="route-${index}-order" type="number" value="${esc(item.order ?? index)}"></label><label><input type="checkbox" name="route-${index}-visible"${item.visible !== false ? ' checked' : ''}> Show in navigation</label><label>Shell override<select name="route-${index}-shell"><option value="">Use default</option>${options(['public','authenticated','minimal'], assignment.shell ?? '')}</select></label><label>Template override<select name="route-${index}-template"><option value="">Use default</option>${options(['standard','two-column','dashboard','form','detail-record'], assignment.template ?? '')}</select></label></fieldset>`; }).join('')}</div>${actionButton('presentation-layout-save', 'Save Layout Draft', { variant: 'primary', type: 'submit' })}<div id="layoutMessage"></div></form></section>`;
  target.querySelector('[data-presentation-back]')?.addEventListener('click', () => void mountPresentation(target, key));
  const heroesButton = document.createElement('button'); heroesButton.type = 'button'; heroesButton.className = 'back-link'; heroesButton.textContent = 'Manage reusable heroes';
  target.querySelector('h2')?.after(heroesButton); heroesButton.addEventListener('click', () => void mountPresentationHeroes(target, key));
  target.querySelector<HTMLFormElement>('#presentationLayoutForm')!.addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const data = new FormData(form); const shells = Object.fromEntries(['public','authenticated','minimal'].map((shell) => [shell, { logoAssetId: String(data.get(`${shell}-logo`) ?? '') || undefined, showNavigation: data.has(`${shell}-navigation`), navigationPlacement: String(data.get(`${shell}-placement`)), showFooter: data.has(`${shell}-footer`), footerText: String(data.get(`${shell}-footerText`) ?? '') }])); const navigation = app.pages.map((route: string, index: number) => ({ route, label: String(data.get(`route-${index}-label`) ?? ''), icon: String(data.get(`route-${index}-icon`) ?? '') || undefined, visible: data.has(`route-${index}-visible`), order: Number(data.get(`route-${index}-order`) ?? index) })); const routes = Object.fromEntries(app.pages.map((route: string, index: number) => [route, { ...(data.get(`route-${index}-shell`) ? { shell: String(data.get(`route-${index}-shell`)) } : {}), ...(data.get(`route-${index}-template`) ? { template: String(data.get(`route-${index}-template`)) } : {}) }])); try { await api(endpoint, { method: 'PUT', body: JSON.stringify({ ...draft, layout: { defaultShell: data.get('defaultShell'), defaultTemplate: data.get('defaultTemplate'), shells, navigation, routes } }) }); await mountPresentation(target, key); } catch (error) { target.querySelector('#layoutMessage')!.innerHTML = `<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`; } });
}

async function mountPresentationHeroes(target: HTMLElement, key: string): Promise<void> {
  const endpoint = `/api/apps/${encodeURIComponent(key)}/presentation`;
  const [status, app] = await Promise.all([api<any>(endpoint), api<any>(`/api/apps/${encodeURIComponent(key)}`)]);
  const route = app.pages[0] ?? '/'; const heroId = status.draft.layout.routes[route]?.heroId ?? 'default-hero'; const hero = status.draft.heroes[heroId];
  const assetMap = Object.fromEntries(status.draft.assets.filter((asset: any) => asset.active).map((asset: any) => [asset.id, `/api/apps/${encodeURIComponent(key)}/presentation/assets/${encodeURIComponent(asset.id)}`]));
  target.innerHTML = `<section class="presentation-editor"><button type="button" class="back-link" data-presentation-back>‹ Layout &amp; Structure</button><h2>Reusable Heroes</h2><p class="note">The UI Base Hero editor owns the hero authoring controls. Saving stores the definition in this application's presentation draft.</p><label>Apply to route<select id="heroRoute">${app.pages.map((item: string) => `<option value="${esc(item)}"${item === route ? ' selected' : ''}>${esc(item)}</option>`).join('')}</select></label><label><input id="heroEnabled" type="checkbox"${hero?.enabled !== false ? ' checked' : ''}> Show the selected route's hero</label><uib-hero-editor id="presentationHeroEditor" application-key="${esc(key)}"></uib-hero-editor><div id="heroMessage"></div></section>`;
  target.querySelector('[data-presentation-back]')?.addEventListener('click', () => void mountPresentationLayout(target, key));
  const editor = target.querySelector<any>('#presentationHeroEditor')!;
  editor.setAttribute('asset-map', JSON.stringify(assetMap));
  editor.heroData = hero?.data ?? { hero_key: heroId, name: 'Application Hero', headline: 'Welcome', subheadline: '', theme: 'organization', size: 'default', visual_mode: 'panel-right' };
  editor.addEventListener('uib-hero-editor-save', async (event: Event) => { const record = (event as CustomEvent<any>).detail?.record ?? editor.heroData; const selectedRoute = (target.querySelector('#heroRoute') as HTMLSelectElement).value; const enabled = (target.querySelector('#heroEnabled') as HTMLInputElement).checked; const id = String(record.hero_key || heroId).replace(/[^a-z0-9-]/gi, '-').toLowerCase(); const variant = record.visual_mode === 'background' ? 'image-background' : record.size === 'compact' ? 'compact' : 'standard'; const next = structuredClone(status.draft); next.heroes[id] = { id, enabled, variant, data: record }; next.layout.routes[selectedRoute] = { ...(next.layout.routes[selectedRoute] ?? {}), ...(enabled ? { heroId: id } : {}) }; if (!enabled) delete next.layout.routes[selectedRoute].heroId; await api(endpoint, { method: 'PUT', body: JSON.stringify(next) }); target.querySelector('#heroMessage')!.innerHTML = `<p>Hero ${enabled ? 'saved to' : 'removed from'} the presentation draft for ${esc(selectedRoute)}.</p>`; });
}

async function mountPresentationEditor(target: HTMLElement, key: string): Promise<void> {
  const endpoint = `/api/apps/${encodeURIComponent(key)}/presentation`;
  try {
    const [status, componentCatalog] = await Promise.all([api<any>(endpoint), api<any[]>('/api/components')]);
    if (!status.initialized) {
      target.innerHTML = `<uib-panel class="content-panel" heading="Application Presentation"><p class="note">Presentation is opt-in. Initializing creates an editable draft with UI Base-compatible token defaults; it does not alter the current application until you publish.</p><div class="actions">${actionButton('presentation-initialize', 'Initialize Presentation', { variant: 'primary' })}</div><div id="presentationMessage"></div></uib-panel>`;
      target.querySelector('[data-action="presentation-initialize"]')?.addEventListener('click', async () => {
        try { await api(`${endpoint}/initialize`, { method: 'POST' }); await mountPresentation(target, key); }
        catch (error) { target.querySelector('#presentationMessage')!.innerHTML = `<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`; }
      });
      return;
    }
    const draft = status.draft;
    const active = status.manifest.activeVersion === null ? 'Not published' : `v${status.manifest.activeVersion}`;
    const componentFields = componentCatalog.flatMap((component: any) => Object.entries(component.presentation?.settings ?? {}).flatMap(([name, raw]) => {
      const setting = raw as any;
      return setting.inheritable === true ? [{ tagName: component.tagName, componentName: component.name, name, setting }] : [];
    }));
    const componentControls = componentFields.map((field: any, index: number) => {
      const current = draft.componentDefaults[field.tagName]?.[field.name];
      const value = current ?? field.setting.default ?? '';
      const input = field.setting.type === 'select'
        ? `<select name="component-${index}-value">${(field.setting.options ?? []).map((option: string | number) => `<option value="${esc(option)}"${String(option) === String(value) ? ' selected' : ''}>${esc(option)}</option>`).join('')}</select>`
        : field.setting.type === 'boolean'
          ? `<input type="checkbox" name="component-${index}-value"${value === true ? ' checked' : ''}>`
          : `<input type="${field.setting.type === 'number' ? 'number' : 'text'}" name="component-${index}-value" value="${esc(value)}">`;
      return `<fieldset><legend>${esc(field.componentName)} · ${esc(field.name)}</legend><label><input type="checkbox" name="component-${index}-enabled"${current !== undefined ? ' checked' : ''}> Use application default</label><label>Value${input}</label></fieldset>`;
    }).join('');
    target.innerHTML = `<uib-panel class="content-panel" heading="Application Presentation">
      <button type="button" class="back-link" data-presentation-back>‹ Presentation overview</button>
      <p class="note">Active: <strong>${esc(active)}</strong>. Draft ${status.draftDiffersFromActive ? 'differs from active' : 'matches active'}. Published application CSS is served at <code>${esc(endpoint)}/active.css</code>.</p>
      <form id="presentationForm" class="stack">
        <label><span>Presentation name</span><input name="name" value="${esc(draft.name)}"></label>
        <div class="presentation-quick-fields"><label><span>Primary color</span><input name="primaryColor" type="color" value="${esc(draft.tokens['--app-color-primary'] ?? '#1f4f8f')}"></label><label><span>Surface color</span><input name="surfaceColor" type="color" value="${esc(draft.tokens['--app-color-surface'] ?? '#ffffff')}"></label><label><span>Body font</span><input name="bodyFont" value="${esc(draft.typography['--app-font-body'] ?? draft.tokens['--app-font-body'] ?? '')}" placeholder="Inter, sans-serif"></label></div>
        <label><span>Application CSS</span><textarea name="css" rows="12">${esc(draft.css)}</textarea></label>
        <section class="component-defaults"><h3>UI Base component defaults</h3><p class="note">Only component-provided, inheritable visual settings appear here. Content, behaviour, and accessibility semantics stay with pages and routes.</p><div class="component-default-grid">${componentControls || '<p class="note">No inheritable UI Base defaults are available yet.</p>'}</div></section>
        <details class="presentation-advanced"><summary>Advanced design tokens</summary><label><span>Design tokens (JSON)</span><textarea name="tokens" rows="10">${esc(JSON.stringify(draft.tokens, null, 2))}</textarea></label><label><span>Typography tokens (JSON)</span><textarea name="typography" rows="6">${esc(JSON.stringify(draft.typography, null, 2))}</textarea></label></details>
        <input type="hidden" name="assets" value="${esc(JSON.stringify(draft.assets))}">
        <div class="actions">${actionButton('presentation-save', 'Save Draft', { variant: 'primary', type: 'submit' })}${actionButton('presentation-publish', 'Publish', { variant: 'muted' })}</div>
        <div id="presentationMessage"></div>
      </form>
      ${status.manifest.versions.length ? `<div class="presentation-versions"><strong>Published versions</strong><ul>${status.manifest.versions.map((version: any) => `<li>v${esc(version.version)} · ${esc(version.publishedAt)} <button type="button" data-presentation-rollback="${esc(version.version)}">Restore as next version</button></li>`).join('')}</ul></div>` : ''}
    </uib-panel>`;
    const form = target.querySelector<HTMLFormElement>('#presentationForm')!;
    target.querySelector('[data-presentation-back]')?.addEventListener('click', () => void mountPresentation(target, key));
    const read = () => {
      const data = new FormData(form);
      const tokens = JSON.parse(String(data.get('tokens') ?? '{}')); const typography = JSON.parse(String(data.get('typography') ?? '{}'));
      tokens['--app-color-primary'] = String(data.get('primaryColor') ?? ''); tokens['--app-color-surface'] = String(data.get('surfaceColor') ?? ''); typography['--app-font-body'] = String(data.get('bodyFont') ?? '');
      const componentDefaults = structuredClone(draft.componentDefaults) as Record<string, Record<string, string | number | boolean>>;
      componentFields.forEach((field: any, index: number) => {
        const enabled = data.has(`component-${index}-enabled`);
        if (!enabled) { delete componentDefaults[field.tagName]?.[field.name]; if (!Object.keys(componentDefaults[field.tagName] ?? {}).length) delete componentDefaults[field.tagName]; return; }
        const raw = field.setting.type === 'boolean' ? data.has(`component-${index}-value`) : data.get(`component-${index}-value`);
        const value = field.setting.type === 'number' ? Number(raw) : field.setting.type === 'boolean' ? Boolean(raw) : String(raw ?? '');
        componentDefaults[field.tagName] = { ...(componentDefaults[field.tagName] ?? {}), [field.name]: value };
      });
      return { name: String(data.get('name') ?? ''), tokens, typography, css: String(data.get('css') ?? ''), componentDefaults, layout: draft.layout, heroes: draft.heroes, assets: JSON.parse(String(data.get('assets') ?? '[]')) };
    };
    const message = (value: string, failure = false) => { target.querySelector('#presentationMessage')!.innerHTML = failure ? `<div class="error">${esc(value)}</div>` : `<p>${esc(value)}</p>`; };
    const save = async () => { await api(endpoint, { method: 'PUT', body: JSON.stringify(read()) }); };
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      try { await save(); message('Draft saved.'); }
      catch (error) { message(error instanceof Error ? error.message : String(error), true); }
    });
    target.querySelector('[data-action="presentation-publish"]')?.addEventListener('click', async () => {
      try { await save(); await api(`${endpoint}/publish`, { method: 'POST' }); await mountPresentation(target, key); }
      catch (error) { message(error instanceof Error ? error.message : String(error), true); }
    });
    target.querySelectorAll<HTMLButtonElement>('[data-presentation-rollback]').forEach((button) => button.addEventListener('click', async () => {
      try { await api(`${endpoint}/rollback`, { method: 'POST', body: JSON.stringify({ version: Number(button.dataset.presentationRollback) }) }); await mountPresentation(target, key); }
      catch (error) { message(error instanceof Error ? error.message : String(error), true); }
    }));
  } catch (error) {
    target.innerHTML = `<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`;
  }
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
      <uib-tab>${icon('calendar')}<span>Presentation</span></uib-tab>
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
      <uib-tab-panel><div id="presentationTarget"></div></uib-tab-panel>
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
  void mountPresentation(root!.querySelector<HTMLElement>('#presentationTarget')!, app.key);

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
    if (Number((event as CustomEvent<{ newValue?: number }>).detail?.newValue) === 4) void preview();
  });
  root!.querySelector('[data-action="preview"]')?.addEventListener('click', () => {
    tabs.selected = '4';
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
    tabs.selected = '4';
    void preview();
  }
}

if (!artifactEditorMounted) {
await refresh();
if (window.location.pathname === '/packages') renderPackages(false);
else renderHome(false);
window.addEventListener('popstate', () => {
  if (window.location.pathname === '/packages') renderPackages(false);
  else renderHome(false);
});
const events = new EventSource('/api/events');
events.addEventListener('artifact-change', event => {
  document.dispatchEvent(new CustomEvent('ui-platform-artifact-change', { detail: JSON.parse(event.data) }));
});
events.addEventListener('workspace-change', async () => {
  await refresh();
  document.dispatchEvent(new CustomEvent('ui-platform-workspace-change'));
  if (!currentKey) renderHome();
  // If a detail screen is open, leave current unsaved inputs alone; Vite preview itself handles source HMR.
});
}
