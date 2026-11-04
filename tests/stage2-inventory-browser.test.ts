import { it, expect } from 'vitest';
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { startFormReference, closeFormReference } from '../scripts/form-reference-host';
import { VisualArtifactService } from '../src/server/visual-artifacts';
import { generateForm, validateArtifact } from '@ui-platform/visual-artifacts';
import type { ArtifactMetadata, PackageComponent } from '@ui-platform/visual-artifacts';

it('authors saved protected Inventory list, selection, Forms and delete in Edge', async () => {
  const evidence = path.resolve('evidence/v1-stage2-20261104'); await mkdir(evidence, { recursive: true });
  const host = await startFormReference(5190, undefined, { schemaPath: 'references/stage2/inventory.dataset.json', deniedFieldId: 'inventory-secret', seedRecords: [{ id: 'hidden-inventory', name: 'Hidden stock', quantity: 9, active: false, secret: 'protected-test-value' }] });
  const owner = new VisualArtifactService(path.join(host.root, 'visual-pages'), 'page');
  let saved = await owner.create('inventory', '/inventory');
  const schema = JSON.parse(await readFile('references/stage2/inventory.dataset.json', 'utf8'));
  const fm: ArtifactMetadata = { schemaVersion: 1, artifactId: 'art_stage2_form', componentId: 'cmp_platform_stage2_form', kind: 'component', name: 'inventory-form', displayName: 'Inventory Form' };
  const ff = generateForm(fm, schema);
  const components = [{ metadata: fm, source: ff.source, css: ff.css }];
  const packages: PackageComponent[] = [];
  for (const name of ['ui', 'forms']) { const manifest = JSON.parse(await readFile(`node_modules/@ui-base/${name}/ui.component.json`, 'utf8')); packages.push(...manifest.components.map((entry: any) => ({ ...entry, id: entry.identity?.componentId ?? `@ui-base/${entry.tagName}`, definition: entry.identity ? entry : undefined }))); }
  const vite = await createServer({ configFile: false, root: process.cwd(), server: { host: '127.0.0.1', port: 5190, strictPort: true, proxy: { '/api': { target: host.origin } } }, plugins: [{ name: 'stage2-isolated-storage', configureServer(server) {
    server.middlewares.use('/stage2/configuration', async (req, res) => {
      try {
        if (req.method === 'POST') {
          let body = ''; for await (const chunk of req) body += chunk;
          const candidate = JSON.parse(body);
          saved = await owner.saveCandidate(saved.locator, { ...saved.files, source: candidate.source, metadata: JSON.stringify(candidate.metadata) }, saved.hash, { validate: async bundle => {
            const errors = validateArtifact({ metadata: bundle.metadata!, source: bundle.files.source, css: bundle.files.css }, components, packages, ['dataset.read', 'dataset.write', 'dataset.deleteRecord']).filter(item => item.severity === 'error');
            if (errors.length) throw new Error(JSON.stringify(errors));
          }, admit: async () => { /* Isolated test owner only; production admission is unchanged. */ } });
        }
        res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(saved.metadata));
      } catch (error) { res.statusCode = 422; res.end(String(error)); }
    });
  } }] });
  let browser: any, page: any;
  const checks: string[] = [], errors: string[] = [], requests: Array<{ path: string; body: string | null }> = [];
  const responses: unknown[] = [], responseCaptures: Promise<void>[] = [];
  try {
    await vite.listen();
    const playwright = createRequire(path.resolve('../ui-base/package.json'))('playwright');
    browser = await playwright.chromium.launch({ headless: false, channel: 'msedge' });
    page = await browser.newPage(); page.on('pageerror', (error: Error) => errors.push(String(error)));
    page.on('request', (request: any) => { if (request.url().includes('/api/application-data/')) requests.push({ path: new URL(request.url()).pathname, body: request.postData() }); });
    page.on('response', (response: any) => { if (response.url().includes('/api/application-data/')) responseCaptures.push((async () => { try { responses.push({ path: new URL(response.url()).pathname, status: response.status(), body: await response.json() }); } catch { /* A deliberately interrupted response has no readable body. */ } })()); });
    await page.goto('http://127.0.0.1:5190/references/stage2/index.html');
    await page.getByLabel('Configure node', { exact: true }).waitFor({ timeout: 45000 });
    await page.getByRole('button', { name: 'Sign in as development admin' }).click();
    await page.getByText('Development admin signed in').waitFor();
    const controls = page.locator('#controls');
    const button = (name: string) => controls.getByRole('button', { name, exact: true }).click();
    const node = (value: string) => controls.getByLabel('Configure node', { exact: true }).selectOption(value);
    const value = (name: string, text: string) => controls.getByLabel(name, { exact: true }).fill(text);
    const choice = (name: string, text: string) => controls.getByLabel(name, { exact: true }).selectOption(text);
    const action = async (kind: string) => { await choice('Action kind', kind); };
    const set = async (target: string, source: string, mode = 'path') => { await action('set'); await choice('Action local state', target); await choice('Action value source', mode); await value('Action value value', source); await button('Add event action'); };
    const binding = async (target: string, source: string) => { await choice('Binding target', target); await value('Binding value', source); await button('Apply binding'); };
    const refresh = async () => { await action('query'); await button('Add event action'); };
    await button('Load applied query Datasets');
    await choice('Query result state', 'inventory'); await choice('Reconcile selected record state', 'selectedId'); await button('Save protected query');
    checks.push('Initial protected query authored through controls');
    await node('card'); await value('Record collection value', 'local.inventory.rows'); await button('Apply repeated records');
    await binding('setting:heading', 'record.name');
    await choice('Binding target', 'setting:selected'); await choice('Binding source', 'equals'); await value('Binding value', 'record.id'); await value('Binding compare with path', 'local.selectedId'); await button('Apply binding');
    await set('selectedId', 'record.id');
    await action('query'); await button('Load applied query Datasets'); await choice('Query result state', 'detail'); await choice('Equality filter field', 'id'); await value('Filter value value', 'record.id'); await button('Save protected query');
    await node('refresh'); await refresh();
    await node('create'); await set('operation', 'create', 'string'); await set('selectedId', '', 'string');
    await node('edit'); await set('operation', 'edit', 'string');
    await node('editor'); await binding('property:operation', 'local.operation'); await binding('property:recordId', 'local.selectedId');
    await choice('Action event', 'submitSucceeded'); await refresh();
    await button('Load applied query Datasets'); await choice('Query result state', 'detail'); await choice('Equality filter field', 'id'); await value('Filter value value', 'local.selectedId'); await button('Save protected query');
    await node('selected'); await binding('text', 'local.selectedId');
    for (const field of ['name', 'quantity', 'active']) { await node('detail-' + field); await binding('text', `local.detail.rows.0.${field}`); }
    for (const state of ['loading', 'empty', 'error', 'denied']) { await node(state); await value('Visible when value', `local.inventory.${state}`); await button('Apply visibility'); }
    await node('delete'); await action('record-delete'); await button('Load applied delete targets');
    await value('Delete record value', 'local.selectedId'); await choice('Delete result state', 'deletion'); await button('Add event action'); await set('operation', 'create', 'string'); await set('detail', '', 'null'); await refresh();
    await node('delete-result'); await binding('text', 'local.deletion.commitOutcome');
    await page.getByRole('button', { name: 'Save configuration', exact: true }).click();
    await page.getByText('Configuration saved', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Reload configuration', exact: true }).click();
    await page.getByRole('button', { name: 'Preview saved Inventory', exact: true }).click();
    const app = page.locator('#app');
    await app.getByText('No inventory records.', { exact: true }).waitFor();
    checks.push('Configuration saved and reloaded through role-bundle storage; empty state visible');
    const invalidBefore = requests.filter(item => item.path.endsWith('/operations')).length;
    await app.getByRole('button', { name: 'Submit', exact: true }).click();
    await app.locator('[data-uip-node="submit-error"]').filter({ hasText: 'Correct the validation errors' }).waitFor();
    expect(requests.filter(item => item.path.endsWith('/operations')).length).toBe(invalidBefore);
    checks.push('Missing required name and number are rejected before a write');
    await app.getByLabel('name', { exact: true }).fill('Zero stock'); await app.getByLabel('quantity', { exact: true }).fill('0');
    await app.getByLabel('notes', { exact: true }).fill('draft'); await app.getByLabel('notes', { exact: true }).fill('');
    await app.getByRole('button', { name: 'Submit', exact: true }).click();
    await app.locator('uib-card').filter({ hasText: 'Zero stock' }).waitFor({ timeout: 30000 });
    checks.push('Form create with zero and false automatically refreshes Cards');
    await page.screenshot({ path: path.join(evidence, 'inventory-created.png'), fullPage: true });
    const records = await page.evaluate(async () => fetch('/api/application-data/queries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ datasetId: 'dataset-stage2-inventory', mode: 'read' }) }).then(response => response.json()));
    expect(records).toEqual([expect.objectContaining({ name: 'Zero stock', quantity: 0, active: false, notes: '' })]);
    const protectedBefore = await readFile(path.join(host.ormData, 'dev-v1-identity-fixture__default__inventory.json'), 'utf8');
    const deniedField = await page.evaluate(async (id: string) => fetch('/api/application-data/operations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ datasetId: 'dataset-stage2-inventory', operation: 'update', records: [{ id, secret: 'forbidden' }] }) }).then(response => response.json()), records[0].id);
    expect(deniedField).toMatchObject({ success: false, committed: false });
    expect(await readFile(path.join(host.ormData, 'dev-v1-identity-fixture__default__inventory.json'), 'utf8')).toBe(protectedBefore);
    const invalid = await page.evaluate(async () => fetch('/api/application-data/operations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ datasetId: 'dataset-stage2-inventory', operation: 'insert', records: [{ id: 'invalid-values', name: '', quantity: 'invalid', active: 'false' }] }) }).then(response => response.json()));
    expect(invalid).toMatchObject({ success: false, committed: false });
    expect(await readFile(path.join(host.ormData, 'dev-v1-identity-fixture__default__inventory.json'), 'utf8')).toBe(protectedBefore);
    checks.push('Direct denied-field write leaves protected storage unchanged');
    await page.getByRole('button', { name: 'Preview saved Inventory', exact: true }).click();
    await app.locator('uib-card').filter({ hasText: 'Zero stock' }).waitFor();
    checks.push('Preview remount reads persisted zero, false and empty string');
    await app.getByRole('button', { name: 'New record', exact: true }).click();
    await app.getByLabel('name', { exact: true }).fill('Unrelated stock'); await app.getByLabel('quantity', { exact: true }).fill('7');
    await app.getByRole('button', { name: 'Submit', exact: true }).click();
    await app.locator('uib-card').filter({ hasText: 'Unrelated stock' }).waitFor();
    await app.locator('uib-card').filter({ hasText: 'Zero stock' }).locator('[part="base"]').click();
    await expect.poll(() => app.locator('[data-uip-node="detail-name"]').innerText()).toBe('Zero stock');
    expect(await app.locator('uib-card[selected]').count()).toBe(1);
    expect(await app.locator('[data-uip-node="detail-quantity"]').innerText()).toBe('0');
    expect(await app.locator('[data-uip-node="detail-active"]').innerText()).toBe('false');
    checks.push('Visually authored permanent-key detail query renders zero and false');
    await app.getByRole('button', { name: 'Edit selected record', exact: true }).click();
    await expect.poll(() => app.getByLabel('name', { exact: true }).inputValue()).toBe('Zero stock');
    await app.getByLabel('name', { exact: true }).fill('Updated stock');
    await app.getByRole('button', { name: 'Submit', exact: true }).click();
    await app.locator('uib-card').filter({ hasText: 'Updated stock' }).waitFor();
    await expect.poll(() => app.locator('[data-uip-node="detail-name"]').innerText()).toBe('Updated stock');
    checks.push('Permanent record selection loads edit Form; update refreshes list');
    await page.route('**/api/application-data/queries', async (route: any) => {
      const input = route.request().postDataJSON();
      if (input.where) await route.abort('connectionfailed'); else await route.continue();
    });
    await app.getByLabel('quantity', { exact: true }).fill('3'); await app.getByRole('button', { name: 'Submit', exact: true }).click();
    await app.locator('[data-uip-node="submit-error"]').filter({ hasText: 'Write committed.' }).waitFor();
    await page.unroute('**/api/application-data/queries');
    await app.getByRole('button', { name: 'Refresh', exact: true }).click(); await app.locator('uib-card').filter({ hasText: 'Updated stock' }).waitFor();
    checks.push('Committed write with interrupted read-back is reported as committed and reconciled by explicit read');
    let interruptedWrites = 0;
    await page.route('**/api/application-data/operations', async (route: any) => { interruptedWrites++; await route.fetch(); await route.abort('connectionfailed'); });
    await app.getByLabel('quantity', { exact: true }).fill('4'); await app.getByRole('button', { name: 'Submit', exact: true }).click();
    await app.locator('[data-uip-node="submit-error"]').filter({ hasText: 'outcome is unknown' }).waitFor();
    await page.waitForTimeout(200); expect(interruptedWrites).toBe(1);
    await page.unroute('**/api/application-data/operations');
    await app.getByRole('button', { name: 'Refresh', exact: true }).click(); await app.locator('uib-card').filter({ hasText: 'Updated stock' }).waitFor();
    checks.push('Lost mutation response is unknown and never automatically retried');
    await host.restartData();
    await app.getByRole('button', { name: 'Refresh', exact: true }).click(); await app.locator('uib-card').filter({ hasText: 'Updated stock' }).waitFor();
    const restarted = await page.evaluate(async () => fetch('/api/application-data/queries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ datasetId: 'dataset-stage2-inventory', mode: 'read' }) }).then(response => response.json()));
    expect(restarted).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Updated stock', quantity: 4 }), expect.objectContaining({ name: 'Unrelated stock', quantity: 7 })]));
    checks.push('Protected host restart reopens persisted records and current security resources');
    // Delay an actual protected read response until after a newer delete/refresh.
    let release: (() => void) | undefined, captured = false;
    let finish: () => void = () => {};
    const delivered = new Promise<void>(resolve => { finish = resolve; });
    await page.route('**/api/application-data/queries', async (route: any) => {
      if (captured) return route.continue();
      captured = true; const response = await route.fetch();
      await new Promise<void>(resolve => { release = resolve; }); await route.fulfill({ response }); finish();
    });
    await app.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect.poll(() => Boolean(release)).toBe(true);
    await app.getByText('Loading inventory…', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(evidence, 'inventory-loading.png'), fullPage: true });
    const queriesBeforeDelete = requests.filter(item => item.path.endsWith('/queries')).length;
    await app.getByRole('button', { name: 'Delete selected record', exact: true }).click();
    await app.locator('uib-card').filter({ hasText: 'Unrelated stock' }).waitFor();
    release!(); await delivered; await page.unroute('**/api/application-data/queries');
    await page.waitForTimeout(200);
    expect(await app.locator('uib-card').count()).toBe(1);
    expect(await app.locator('uib-card').filter({ hasText: 'Updated stock' }).count()).toBe(0);
    expect(await app.locator('[data-uip-node="selected"]').innerText()).toBe('');
    expect(requests.filter(item => item.path.endsWith('/queries')).length - queriesBeforeDelete).toBe(1);
    checks.push('Protected single-record delete refreshes list and clears selection');
    checks.push('Delayed older protected read cannot resurrect deleted record; unrelated record remains');
    await page.screenshot({ path: path.join(evidence, 'inventory-deleted.png'), fullPage: true });
    const snapshot = await readFile(path.join(host.ormData, 'dev-v1-identity-fixture__default__inventory.json'), 'utf8');
    const stale = await page.evaluate(async () => fetch('/api/application-data/operations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'record-delete', version: 1, datasetId: 'dataset-stage2-inventory', primaryFieldId: 'inventory-id', recordId: 'missing-record' }) }).then(response => response.json()));
    expect(stale).toMatchObject({ success: false, committed: false });
    expect(await readFile(path.join(host.ormData, 'dev-v1-identity-fixture__default__inventory.json'), 'utf8')).toBe(snapshot);
    const denied = await page.evaluate(async () => fetch('/api/application-data/queries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ datasetId: 'foreign-inventory', mode: 'read' }) }).then(async response => ({ status: response.status, body: await response.text() })));
    expect(denied.body).not.toContain('Unrelated stock');
    const logout = await page.evaluate(async () => { const session = await fetch('/api/development-identity/session').then(response => response.json()); return (await fetch('/api/development-identity/session', { method: 'DELETE', headers: { 'content-type': 'application/json', 'x-v1-csrf': session.csrfToken } })).status; });
    expect(logout).toBe(200);
    await app.getByRole('button', { name: 'Refresh', exact: true }).click();
    await app.getByText('Inventory access denied.', { exact: true }).waitFor();
    const deniedMutation = await page.evaluate(async () => fetch('/api/application-data/operations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ datasetId: 'dataset-stage2-inventory', operation: 'insert', records: [{ id: 'signed-out', name: 'Denied', quantity: 0, active: false }] }) }).then(response => response.status));
    expect([401, 403]).toContain(deniedMutation);
    expect(await readFile(path.join(host.ormData, 'dev-v1-identity-fixture__default__inventory.json'), 'utf8')).toBe(snapshot);
    expect(await app.getByText('No inventory records.', { exact: true }).count()).toBe(0);
    await page.screenshot({ path: path.join(evidence, 'inventory-denied.png'), fullPage: true });
    checks.push('Signed-out protected read shows denied separately from empty; foreign Dataset leaks no records');
    await page.getByRole('button', { name: 'Sign in as development admin' }).click(); await page.getByText('Development admin signed in').waitFor();
    await page.route('**/api/application-data/queries', (route: any) => route.abort('connectionfailed'));
    const writesBefore = requests.filter(item => item.path.endsWith('/operations')).length;
    await app.getByRole('button', { name: 'Refresh', exact: true }).click(); await app.getByText('Inventory request failed. Use Refresh to retry the read.', { exact: true }).waitFor();
    expect(requests.filter(item => item.path.endsWith('/operations')).length).toBe(writesBefore);
    await page.unroute('**/api/application-data/queries');
    await app.getByRole('button', { name: 'Refresh', exact: true }).click(); await app.locator('uib-card').filter({ hasText: 'Unrelated stock' }).waitFor();
    checks.push('Interrupted read shows error; explicit Refresh recovers without a mutation retry');
    const hiddenBefore = await readFile(path.join(host.ormData, 'dev-v1-identity-fixture__default__inventory.json'), 'utf8');
    const rowDenied = await page.evaluate(async () => {
      const send = async (path: string, body: object) => fetch('/api/application-data/' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async response => ({ status: response.status, body: await response.text() }));
      return { read: await send('queries', { datasetId: 'dataset-stage2-inventory', where: { field: 'id', op: 'eq', value: 'hidden-inventory' }, mode: 'read' }), update: await send('operations', { datasetId: 'dataset-stage2-inventory', operation: 'update', records: [{ id: 'hidden-inventory', quantity: 99 }] }), delete: await send('operations', { kind: 'record-delete', version: 1, datasetId: 'dataset-stage2-inventory', primaryFieldId: 'inventory-id', recordId: 'hidden-inventory' }) };
    });
    expect(rowDenied.read.body).not.toContain('Hidden stock');
    expect(JSON.parse(rowDenied.update.body)).toMatchObject({ success: false, committed: false });
    expect(JSON.parse(rowDenied.delete.body)).toMatchObject({ success: false, committed: false });
    expect(await readFile(path.join(host.ormData, 'dev-v1-identity-fixture__default__inventory.json'), 'utf8')).toBe(hiddenBefore);
    checks.push('Current row policy hides protected record and rejects tampered update/delete without storage change');
    let releaseDestroyed: (() => void) | undefined, capturedDestroyed = false;
    let finishDestroyed: () => void = () => {};
    const deliveredDestroyed = new Promise<void>(resolve => { finishDestroyed = resolve; });
    await page.route('**/api/application-data/queries', async (route: any) => {
      if (capturedDestroyed) return route.continue();
      capturedDestroyed = true; const response = await route.fetch();
      await new Promise<void>(resolve => { releaseDestroyed = resolve; }); await route.fulfill({ response }); finishDestroyed();
    });
    await app.getByRole('button', { name: 'Refresh', exact: true }).click(); await expect.poll(() => Boolean(releaseDestroyed)).toBe(true);
    const remaining = restarted.find((record: any) => record.name === 'Unrelated stock');
    const removed = await page.evaluate(async (id: string) => fetch('/api/application-data/operations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'record-delete', version: 1, datasetId: 'dataset-stage2-inventory', primaryFieldId: 'inventory-id', recordId: id }) }).then(response => response.json()), remaining.id);
    expect(removed).toMatchObject({ success: true, committed: true });
    await page.getByRole('button', { name: 'Preview saved Inventory', exact: true }).click(); await app.getByText('No inventory records.', { exact: true }).waitFor();
    releaseDestroyed!(); await deliveredDestroyed; await page.unroute('**/api/application-data/queries');
    await page.waitForTimeout(200); expect(await app.locator('uib-card').count()).toBe(0);
    const idleRequests = requests.length; await page.waitForTimeout(1000); expect(requests.length).toBe(idleRequests);
    checks.push('Destroyed view ignores delayed response; settled view performs no idle polling');
    await page.addScriptTag({ type: 'module', content: "import { mountVisualArtifact } from '/packages/visual-artifacts/src/runtime.ts'; window.stage2RegionRuntime = mountVisualArtifact;" });
    await page.waitForFunction(() => typeof (window as any).stage2RegionRuntime === 'function');
    const crossRegion = await page.evaluate(async () => {
      const mountVisualArtifact = (window as any).stage2RegionRuntime;
      const scope = { state: { result: null }, data: {}, subscribers: new Set<() => void>(), initialized: false };
      const pending: Array<(rows: object[]) => void> = [];
      const artifact = { source: '<button data-uip-node="refresh">Read</button>', css: '', metadata: { schemaVersion: 1 as const, artifactId: 'art_stage2_regions', kind: 'page' as const, name: 'regions', displayName: 'Regions', route: '/regions', state: { result: null }, events: [{ node: 'refresh', event: 'click', actions: [{ kind: 'service' as const, reference: 'dataset.read', resultState: 'result' }] }] } };
      const options = { components: [], packages: [], sharedScope: scope, services: { 'dataset.read': () => new Promise<object[]>(resolve => pending.push(resolve)) } };
      const first = mountVisualArtifact(artifact, options), second = mountVisualArtifact(artifact, options);
      document.body.append(first.host, second.host);
      first.root.querySelector<HTMLButtonElement>('button')!.click(); second.root.querySelector<HTMLButtonElement>('button')!.click();
      pending[1]([{ id: 'newer' }]); await new Promise(resolve => setTimeout(resolve, 0));
      pending[0]([{ id: 'older' }]); await new Promise(resolve => setTimeout(resolve, 0));
      const result = JSON.stringify(scope.state.result); first.destroy(); second.destroy(); return result;
    });
    expect(JSON.parse(crossRegion).rows).toEqual([{ id: 'newer' }]);
    checks.push('Separate Page regions share request generations; older region response cannot overwrite newer result');
    await writeFile(path.join(evidence, 'protected-records.json'), JSON.stringify({ created: records, afterDelete: JSON.parse(snapshot), stale, denied, rowDenied }, null, 2));
    expect(errors).toEqual([]);
  } catch (error) {
    if (page) { await page.screenshot({ path: path.join(evidence, 'failure.png'), fullPage: true }).catch(() => {}); await writeFile(path.join(evidence, 'failure.txt'), String(error) + '\n' + await page.locator('body').innerText()); }
    throw error;
  } finally {
    await Promise.all(responseCaptures);
    const extensions = { source: 'html', metadata: 'visual.json', css: 'css', fixtures: 'fixtures.json', code: 'functions.ts' };
    for (const [folder, files, stem] of [['saved-page', saved.files, 'page'], ['runtime-fixture-form', ff, 'component']] as const) {
      await mkdir(path.join(evidence, folder), { recursive: true });
      for (const [role, extension] of Object.entries(extensions)) await writeFile(path.join(evidence, folder, `${stem}.${extension}`), files[role as keyof typeof files]);
    }
    await writeFile(path.join(evidence, 'browser-results.json'), JSON.stringify({ startup: host.startup, checks, errors, requests, responses, browser: browser?.version(), configuration: saved.metadata }, null, 2));
    await browser?.close(); await vite.close(); await closeFormReference();
  }
}, 180000);
