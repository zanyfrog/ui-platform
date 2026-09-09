import type { AppFoundationDependencyPayload, AppPackageCatalogPayload, AppPackageListEntry, FoundationSource, FoundationSourcePayload, PackageCatalogPayload, PackageListEntry, PackageManifestIssue } from '../shared/types';

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = init?.body instanceof FormData ? init?.headers : { 'content-type': 'application/json', ...(init?.headers ?? {}) };
  const response = await fetch(url, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? `Request failed: ${response.status}`);
  return payload as T;
}

function esc(value: unknown): string {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function date(value?: string): string {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleString();
}

function packageIcon(entry: PackageListEntry): string {
  const letter = (entry.displayName || entry.name || '?').trim().slice(0, 1).toUpperCase() || '?';
  if (entry.icon && /^(?:https?:|data:|\/)/.test(entry.icon)) {
    return `<span class="package-icon"><img src="${esc(entry.icon)}" alt="" /></span>`;
  }
  return `<span class="package-icon" title="${esc(entry.icon || 'No icon asset exposed')}">${esc(letter)}</span>`;
}

function issueButton(id: string, count: number): string {
  return count ? `<button class="warning-link" data-package-issues="${esc(id)}">${count} warning${count === 1 ? '' : 's'}</button>` : '';
}

function packageSourcePanel(scope: 'platform' | 'app'): string {
  const label = scope === 'platform' ? 'Add package source' : 'Add package to this app';
  return `<form class="package-install-panel" data-package-source="${scope}" enctype="multipart/form-data">
    <div><strong>${label}</strong><p class="note">Upload a UIB package archive, or enter a GitHub or npm URL. The platform identifies the source and applies the matching validation path.</p></div>
    <div class="package-source-fields"><div class="package-file-field"><span>Package archive</span><div class="package-file-drop-zone" data-file-drop-zone><input class="sr-only" type="file" name="packageFile" accept=".zip,.tgz,.tar.gz,application/zip,application/gzip"><span data-file-selection>Drop an archive here</span><button type="button" data-choose-package-file>Choose File</button></div></div><span class="source-divider">or</span><label><span>Package URL</span><input name="sourceUrl" placeholder="GitHub repository or npm package URL" aria-label="GitHub or npm package URL"></label><button type="submit" class="primary">Add package</button></div>
    <p class="note" data-source-guess>Choose an archive or enter a source URL.</p>
  </form>`;
}

function githubFoundationSourcePanel(sources: FoundationSource[]): string {
  return '<section class="package-install-panel foundation-source-panel">' +
    '<div><strong>GitHub foundation sources</strong><p class="note">Install a trusted GitHub workspace at an immutable commit. Foundation dependencies stay separate from UIB extension packages.</p></div>' +
    (sources.length ? '<div class="foundation-source-list">' + sources.map((source) => '<details><summary><strong>' + esc(source.id) + '</strong><span class="note">' + esc(source.commit.slice(0, 12)) + '</span></summary><p class="note">' + esc(source.repository) + '</p><p class="note">' + source.packages.length + ' @ui-base packages</p></details>').join('') + '</div>' : '<p class="note">No GitHub foundation sources installed.</p>') +
    '</section>';
}

function foundationDependencyPanels(sources: FoundationSource[], stateBySource: Map<string, AppFoundationDependencyPayload>): string {
  if (!sources.length) return '';
  return '<section class="package-install-panel foundation-source-panel"><div><strong>Foundation dependencies</strong><p class="note">Select UI-Base packages for this app. Required UI-Base workspace dependencies are included automatically.</p></div>' +
    sources.map((source) => {
      const state = stateBySource.get(source.id);
      const fromSource = new Set(state?.fromSourcePackageNames ?? []);
      const existing = new Set(state?.existingPackageNames ?? []);
      const direct = new Set(state?.directPackageNames ?? []);
      const allSelected = source.packages.every((pkg) => fromSource.has(pkg.name) || existing.has(pkg.name));
      return '<form data-foundation-dependencies="' + esc(source.id) + '"><details><summary><strong>' + esc(source.id) + '</strong><span class="note">' + esc(source.commit.slice(0, 12)) + '</span></summary><div class="foundation-package-options">' + source.packages.map((pkg) => {
        const status = direct.has(pkg.name) ? 'Direct' : fromSource.has(pkg.name) ? (state?.hasImportRecord ? 'Dependency' : 'Imported before tracking') : existing.has(pkg.name) ? 'Already present' : '';
        const selected = Boolean(status);
        const className = fromSource.has(pkg.name) ? 'is-added' : existing.has(pkg.name) ? 'is-existing' : '';
        return '<label' + (className ? ' class="' + className + '"' : '') + '><input type="checkbox" name="packageName" value="' + esc(pkg.name) + '"' + (selected ? ' checked disabled' : '') + '><span><code>' + esc(pkg.name) + '</code> <small>v' + esc(pkg.version) + (status ? ' - ' + status : '') + '</small></span></label>';
      }).join('') + '</div></details><div class="actions package-actions"><button type="submit"' + (allSelected ? ' disabled' : '') + '>Add selected dependencies</button></div></form>';
    }).join('') +
    '</section>';
}

function installedFoundationPackagesPanel(sources: FoundationSource[], stateBySource: Map<string, AppFoundationDependencyPayload>): string {
  const sourceSections = sources.map((source) => {
    const state = stateBySource.get(source.id);
    const fromSource = new Set(state?.fromSourcePackageNames ?? []);
    const existing = new Set(state?.existingPackageNames ?? []);
    const direct = new Set(state?.directPackageNames ?? []);
    const installed = source.packages.filter((pkg) => fromSource.has(pkg.name) || existing.has(pkg.name));
    if (!installed.length) return '';
    return `<details class="foundation-installed-source" open><summary><strong>${esc(source.id)}</strong><span class="note">${installed.length} installed</span></summary><ul>${installed.map((pkg) => {
      const status = direct.has(pkg.name) ? 'Direct' : fromSource.has(pkg.name) ? (state?.hasImportRecord ? 'Dependency' : 'Imported before tracking') : 'Already present';
      return `<li><code>${esc(pkg.name)}</code><small>${esc(status)} - v${esc(pkg.version)}</small></li>`;
    }).join('')}</ul></details>`;
  }).filter(Boolean).join('');
  if (!sourceSections) return '';
  return `<section class="foundation-installed-panel"><div><strong>Installed foundation packages</strong><p class="note">Direct selections and their resolved dependencies for this app.</p></div>${sourceSections}</section>`;
}

function packageCard(entry: PackageListEntry | AppPackageListEntry, index: number, appKey?: string): string {
  const appEntry = 'appEnabled' in entry ? entry : null;
  const issueId = `${appKey ?? 'global'}-${index}`;
  const statusClass = `status-${entry.status}`;
  const canEnable = appEntry && !appEntry.appEnabled && entry.status !== 'missing' && entry.status !== 'incompatible';
  const canDisable = appEntry && appEntry.appEnabled;
  return `
    <details class="package-card">
      <summary>
        ${packageIcon(entry)}
        <span class="package-title"><strong>${esc(entry.displayName)}</strong><code>${esc(entry.name)}</code></span>
        <span class="package-version">${entry.version ? `v${esc(entry.version)}` : 'unresolved'}</span>
        <span class="package-status ${statusClass}">${esc(entry.status)}</span>
        ${issueButton(issueId, entry.issues.length)}
      </summary>
      <div class="package-detail">
        <dl>
          <div><dt>Source</dt><dd>${esc(entry.sourceLabel)}</dd></div>
          <div><dt>Manifest</dt><dd><code>${esc(entry.manifestPath || 'Not resolved')}</code></dd></div>
          <div><dt>Package root</dt><dd><code>${esc(entry.packageRoot || 'Not resolved')}</code></dd></div>
          <div><dt>Capabilities</dt><dd>${entry.capabilities.map((capability) => `<span class="badge">${esc(capability)}</span>`).join(' ') || 'None declared'}</dd></div>
          <div><dt>Components</dt><dd>${entry.components.length}</dd></div>
          <div><dt>First discovered</dt><dd>${date(entry.firstDiscoveredAt)}</dd></div>
          <div><dt>Added</dt><dd>${date(entry.addedAt)}</dd></div>
          <div><dt>Last discovered</dt><dd>${date(entry.lastDiscoveredAt)}</dd></div>
          ${appEntry ? `<div><dt>Requested version</dt><dd>${esc(appEntry.requestedVersion ?? 'Not declared')}</dd></div>` : ''}
          ${appEntry ? `<div><dt>Resolution</dt><dd>${esc(appEntry.resolution)}</dd></div>` : ''}
        </dl>
        ${appEntry ? `<div class="actions package-actions">
          ${canEnable ? `<button class="primary" data-package-enable="${esc(entry.name)}">Enable</button>` : ''}
          ${canDisable ? `<button data-package-disable="${esc(entry.name)}">Disable</button>` : ''}
        </div>` : ''}
      </div>
    </details>
  `;
}

function rejectedRow(issue: PackageManifestIssue, index: number): string {
  return `<li><button class="warning-link" data-rejected-issue="${index}">${esc(issue.filePath)}</button><small>${esc(issue.sourceType)}</small></li>`;
}

export async function mountGlobalPackages(target: HTMLElement): Promise<void> {
  target.innerHTML = '<p class="note">Loading packages...</p>';
  try {
    const [payload, foundationPayload] = await Promise.all([
      api<PackageCatalogPayload>('/api/packages'),
      api<FoundationSourcePayload>('/api/foundation-sources'),
    ]);
    const issueMap = new Map<string, string[]>();
    payload.entries.forEach((entry, index) => issueMap.set(`global-${index}`, entry.issues));
    target.innerHTML = `
      <section class="panel stack">
        <div class="package-heading"><div><uib-heading text="Packages" level="2"></uib-heading><p class="note">Global package catalog from platform packages and installed @uib packages.</p></div><span class="badge">${payload.entries.length} package${payload.entries.length === 1 ? '' : 's'}</span></div>
        ${packageSourcePanel('platform')}
        ${githubFoundationSourcePanel(foundationPayload.sources)}
        ${payload.rejected.length ? `<div class="warning-box"><strong>${payload.rejected.length} rejected manifest${payload.rejected.length === 1 ? '' : 's'}</strong><ul>${payload.rejected.map(rejectedRow).join('')}</ul></div>` : ''}
        <div class="package-list">${payload.entries.map((entry, index) => packageCard(entry, index)).join('') || '<p class="note">No UIB packages discovered.</p>'}</div>
      </section>
    `;
    bindIssueButtons(target, issueMap, payload.rejected);
    bindPackageSource(target, 'platform');
  } catch (error) {
    target.innerHTML = `<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`;
  }
}

export async function mountAppPackages(target: HTMLElement, appKey: string): Promise<void> {
  target.innerHTML = '<p class="note">Loading app packages...</p>';
  try {
    const [payload, foundationPayload] = await Promise.all([
      api<AppPackageCatalogPayload>(`/api/apps/${encodeURIComponent(appKey)}/packages`),
      api<FoundationSourcePayload>('/api/foundation-sources'),
    ]);
    const selectedPayloads = await Promise.all(foundationPayload.sources.map((source) => api<AppFoundationDependencyPayload>(`/api/apps/${encodeURIComponent(appKey)}/foundation-dependencies/${encodeURIComponent(source.id)}`)));
    renderAppPackagePayload(target, appKey, payload, foundationPayload.sources, new Map(selectedPayloads.map((item) => [item.sourceId, item])));
  } catch (error) {
    target.innerHTML = `<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`;
  }
}

function renderAppPackagePayload(target: HTMLElement, appKey: string, payload: AppPackageCatalogPayload, foundationSources: FoundationSource[], foundationState = new Map<string, AppFoundationDependencyPayload>()): void {
  const issueMap = new Map<string, string[]>();
  payload.entries.forEach((entry, index) => issueMap.set(`${appKey}-${index}`, entry.issues));
  const enabledCount = payload.entries.filter((entry) => entry.appEnabled).length;
    target.innerHTML = `
    <div class="package-heading"><div><uib-heading text="Packages" level="2" size="compact"></uib-heading><p class="note">App package intent is stored in <code>app.manifest.json</code>. Resolution checks app-local packages first, then platform packages.</p></div><span class="badge">${enabledCount} enabled</span></div>
    ${packageSourcePanel('app')}
    ${installedFoundationPackagesPanel(foundationSources, foundationState)}
    ${foundationDependencyPanels(foundationSources, foundationState)}
    ${payload.rejected.length ? `<div class="warning-box"><strong>${payload.rejected.length} rejected manifest${payload.rejected.length === 1 ? '' : 's'}</strong><ul>${payload.rejected.map(rejectedRow).join('')}</ul></div>` : ''}
    <div class="package-list compact">${payload.entries.map((entry, index) => packageCard(entry, index, appKey)).join('') || '<p class="note">No packages discovered.</p>'}</div>
  `;
  bindIssueButtons(target, issueMap, payload.rejected);
  bindPackageSource(target, 'app', appKey);
  bindFoundationDependencies(target, appKey, foundationSources);
  target.querySelectorAll<HTMLButtonElement>('[data-package-enable]').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      const packageName = button.dataset.packageEnable!;
      const entry = payload.entries.find((item) => item.name === packageName);
      try {
        const next = await api<AppPackageCatalogPayload>(`/api/apps/${encodeURIComponent(appKey)}/packages/${encodeURIComponent(packageName)}/enable`, {
          method: 'POST',
          body: JSON.stringify({ version: entry?.requestedVersion ?? (entry?.version ? `^${entry.version}` : undefined) }),
        });
        renderAppPackagePayload(target, appKey, next, foundationSources, foundationState);
      } catch (error) {
        showIssueDialog('Package enable failed', [error instanceof Error ? error.message : String(error)]);
        button.disabled = false;
      }
    });
  });
  target.querySelectorAll<HTMLButtonElement>('[data-package-disable]').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const next = await api<AppPackageCatalogPayload>(`/api/apps/${encodeURIComponent(appKey)}/packages/${encodeURIComponent(button.dataset.packageDisable!)}/disable`, { method: 'POST' });
        renderAppPackagePayload(target, appKey, next, foundationSources, foundationState);
      } catch (error) {
        showIssueDialog('Package disable failed', [error instanceof Error ? error.message : String(error)]);
        button.disabled = false;
      }
    });
  });
}

function bindPackageSource(target: HTMLElement, scope: 'platform' | 'app', appKey?: string): void {
  const form = target.querySelector<HTMLFormElement>('[data-package-source]');
  if (!form) return;
  const urlInput = form.elements.namedItem('sourceUrl') as HTMLInputElement;
  const fileInput = form.elements.namedItem('packageFile') as HTMLInputElement;
  const guess = form.querySelector<HTMLElement>('[data-source-guess]')!;
  const dropZone = form.querySelector<HTMLElement>('[data-file-drop-zone]')!;
  const fileSelection = form.querySelector<HTMLElement>('[data-file-selection]')!;
  const chooseFile = form.querySelector<HTMLButtonElement>('[data-choose-package-file]')!;
  const updateGuess = () => {
    if (fileInput.files?.length) { fileSelection.textContent = fileInput.files[0].name; guess.textContent = 'Package archive selected. It will be validated as a UIB extension package.'; return; }
    fileSelection.textContent = 'Drop an archive here';
    const value = urlInput.value.trim();
    if (/^(?:git@github\.com:|https:\/\/github\.com\/)/i.test(value)) { guess.textContent = scope === 'platform' ? 'GitHub workspace detected. It will be registered as a foundation source.' : 'GitHub foundation sources are registered globally, then selected for an app.'; return; }
    if (value) { guess.textContent = /npmjs\.com|registry\.npmjs\.org|^npm:|^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)(?:@[a-z0-9][a-z0-9._-]*)?$/i.test(value) ? 'npm package detected. It will be packed, validated, and installed.' : 'Source is not recognized yet. Use a GitHub or npm URL.'; return; }
    guess.textContent = 'Choose an archive or enter a source URL.';
  };
  const selectFile = (file: File) => {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    updateGuess();
  };
  chooseFile.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (event) => { event.preventDefault(); dropZone.classList.add('is-dragging'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragging'));
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
    const file = event.dataTransfer?.files[0];
    if (file) selectFile(file);
  });
  fileInput.addEventListener('change', updateGuess);
  urlInput.addEventListener('input', updateGuess);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const data = new FormData(form);
    button.disabled = true;
    button.textContent = 'Adding...';
    const endpoint = scope === 'platform' ? '/api/packages/acquire' : `/api/apps/${encodeURIComponent(appKey!)}/packages/acquire`;
    try {
      const acquired = await api<{ kind: 'package'; package: { name: string; version: string } } | { kind: 'foundation-source'; source: FoundationSource }>(endpoint, {
        method: 'POST',
        body: data,
      });
      if (scope === 'platform') await mountGlobalPackages(target);
      else await mountAppPackages(target, appKey!);
      showIssueDialog(acquired.kind === 'foundation-source' ? 'GitHub source installed' : 'Package installed', acquired.kind === 'foundation-source'
        ? [acquired.source.id + ' is pinned to ' + acquired.source.commit + '.', acquired.source.packages.length + ' UI-Base workspace packages are available to applications.']
        : [acquired.package.name + ' v' + acquired.package.version + ' is now available. Enable it separately for an app.']);
    } catch (error) {
      showIssueDialog('Package acquisition failed', [error instanceof Error ? error.message : String(error)]);
      button.disabled = false;
      button.textContent = 'Add package';
    }
  });
}

function bindFoundationDependencies(target: HTMLElement, appKey: string, foundationSources: FoundationSource[]): void {
  target.querySelectorAll<HTMLFormElement>('[data-foundation-dependencies]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      const packageNames = [...new FormData(form).getAll('packageName')].map((value) => String(value));
      const source = foundationSources.find((item) => item.id === form.dataset.foundationDependencies);
      if (!source) return;
      const transitivePackages = resolveFoundationDependencies(source, packageNames).filter((name) => !packageNames.includes(name));
      if (!(await confirmFoundationDependencies(packageNames, transitivePackages))) return;
      button.disabled = true;
      try {
        const result = await api<{ packages: string[]; requestedPackages: string[]; transitivePackages: string[]; installRequired: true }>(`/api/apps/${encodeURIComponent(appKey)}/foundation-dependencies`, {
          method: 'POST',
          body: JSON.stringify({ sourceId: form.dataset.foundationDependencies, packageNames }),
        });
        await mountAppPackages(target, appKey);
        showIssueDialog('Dependencies added', [
          'Selected: ' + result.requestedPackages.join(', '),
          ...(result.transitivePackages.length ? ['Added automatically: ' + result.transitivePackages.join(', ')] : []),
          'package.json was updated. Run npm install --ignore-scripts in the application before building or previewing it.',
        ]);
      } catch (error) {
        showIssueDialog('Dependency update failed', [error instanceof Error ? error.message : String(error)]);
        button.disabled = false;
      }
    });
  });
}

function resolveFoundationDependencies(source: FoundationSource, requested: string[]): string[] {
  const packages = new Map(source.packages.map((pkg) => [pkg.name, pkg]));
  const resolved = new Set<string>();
  const include = (name: string) => {
    const pkg = packages.get(name);
    if (!pkg || resolved.has(name)) return;
    resolved.add(name);
    pkg.dependencies.forEach(include);
  };
  requested.forEach(include);
  return [...resolved].sort();
}

function confirmFoundationDependencies(requested: string[], transitive: string[]): Promise<boolean> {
  if (!requested.length) {
    showIssueDialog('Select dependencies', ['Select at least one package that is not already present.']);
    return Promise.resolve(false);
  }
  const existing = document.querySelector<HTMLDialogElement>('#foundationDependencyDialog');
  existing?.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'foundationDependencyDialog';
  dialog.className = 'package-dialog';
  dialog.innerHTML = `<form method="dialog" class="stack"><div class="package-heading"><strong>Review dependencies</strong></div><div><strong>Selected</strong><ul>${requested.map((name) => `<li>${esc(name)}</li>`).join('')}</ul></div>${transitive.length ? `<div><strong>Added automatically</strong><ul>${transitive.map((name) => `<li>${esc(name)}</li>`).join('')}</ul></div>` : ''}<div class="actions"><button value="cancel">Cancel</button><button class="primary" value="confirm">Add dependencies</button></div></form>`;
  document.body.append(dialog);
  dialog.showModal();
  return new Promise((resolve) => dialog.addEventListener('close', () => { const confirmed = dialog.returnValue === 'confirm'; dialog.remove(); resolve(confirmed); }, { once: true }));
}

function bindIssueButtons(target: HTMLElement, issueMap: Map<string, string[]>, rejected: PackageManifestIssue[]): void {
  target.querySelectorAll<HTMLButtonElement>('[data-package-issues]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const issues = issueMap.get(button.dataset.packageIssues ?? '') ?? [];
      showIssueDialog('Package warnings', issues);
    });
  });
  target.querySelectorAll<HTMLButtonElement>('[data-rejected-issue]').forEach((button) => {
    button.addEventListener('click', () => {
      const issue = rejected[Number(button.dataset.rejectedIssue)];
      if (issue) showIssueDialog('Rejected manifest', [`${issue.filePath}`, ...issue.issues]);
    });
  });
}

function showIssueDialog(title: string, issues: string[]): void {
  const existing = document.querySelector<HTMLDialogElement>('#packageIssueDialog');
  existing?.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'packageIssueDialog';
  dialog.className = 'package-dialog';
  dialog.innerHTML = `<form method="dialog" class="stack"><div class="package-heading"><strong>${esc(title)}</strong><button value="close" aria-label="Close">Close</button></div><ul>${issues.map((issue) => `<li>${esc(issue)}</li>`).join('')}</ul></form>`;
  document.body.append(dialog);
  dialog.showModal();
}
