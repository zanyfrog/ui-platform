import type { AppPackageCatalogPayload, AppPackageListEntry, PackageCatalogPayload, PackageListEntry, PackageManifestIssue } from '../shared/types';

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) }, ...init });
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
    const payload = await api<PackageCatalogPayload>('/api/packages');
    const issueMap = new Map<string, string[]>();
    payload.entries.forEach((entry, index) => issueMap.set(`global-${index}`, entry.issues));
    target.innerHTML = `
      <section class="panel stack">
        <div class="package-heading"><div><uib-heading text="Packages" level="2"></uib-heading><p class="note">Global package catalog from platform packages and installed @uib packages.</p></div><span class="badge">${payload.entries.length} package${payload.entries.length === 1 ? '' : 's'}</span></div>
        ${payload.rejected.length ? `<div class="warning-box"><strong>${payload.rejected.length} rejected manifest${payload.rejected.length === 1 ? '' : 's'}</strong><ul>${payload.rejected.map(rejectedRow).join('')}</ul></div>` : ''}
        <div class="package-list">${payload.entries.map((entry, index) => packageCard(entry, index)).join('') || '<p class="note">No UIB packages discovered.</p>'}</div>
      </section>
    `;
    bindIssueButtons(target, issueMap, payload.rejected);
  } catch (error) {
    target.innerHTML = `<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`;
  }
}

export async function mountAppPackages(target: HTMLElement, appKey: string): Promise<void> {
  target.innerHTML = '<p class="note">Loading app packages...</p>';
  try {
    const payload = await api<AppPackageCatalogPayload>(`/api/apps/${encodeURIComponent(appKey)}/packages`);
    renderAppPackagePayload(target, appKey, payload);
  } catch (error) {
    target.innerHTML = `<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`;
  }
}

function renderAppPackagePayload(target: HTMLElement, appKey: string, payload: AppPackageCatalogPayload): void {
  const issueMap = new Map<string, string[]>();
  payload.entries.forEach((entry, index) => issueMap.set(`${appKey}-${index}`, entry.issues));
  const enabledCount = payload.entries.filter((entry) => entry.appEnabled).length;
  target.innerHTML = `
    <div class="package-heading"><div><uib-heading text="Packages" level="2" size="compact"></uib-heading><p class="note">App package intent is stored in <code>app.manifest.json</code>. Resolution checks app-local packages first, then platform packages.</p></div><span class="badge">${enabledCount} enabled</span></div>
    ${payload.rejected.length ? `<div class="warning-box"><strong>${payload.rejected.length} rejected manifest${payload.rejected.length === 1 ? '' : 's'}</strong><ul>${payload.rejected.map(rejectedRow).join('')}</ul></div>` : ''}
    <div class="package-list compact">${payload.entries.map((entry, index) => packageCard(entry, index, appKey)).join('') || '<p class="note">No packages discovered.</p>'}</div>
  `;
  bindIssueButtons(target, issueMap, payload.rejected);
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
        renderAppPackagePayload(target, appKey, next);
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
        renderAppPackagePayload(target, appKey, next);
      } catch (error) {
        showIssueDialog('Package disable failed', [error instanceof Error ? error.message : String(error)]);
        button.disabled = false;
      }
    });
  });
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