import { afterEach, expect, it } from 'vitest';
import { createServer as httpServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { readFile, writeFile, stat, rm } from 'node:fs/promises';
import { createServer } from 'vite';
import { startAutomationReference } from '../scripts/trigger-workflow-reference-host.js';
import { closeFormReference } from '../scripts/form-reference-host.js';
const cleanup: Array<() => Promise<unknown>> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); await closeFormReference(); });
async function reference(config = 'references/trigger-workflow/vite.config.ts') {
  const probe = httpServer(); await new Promise<void>(r => probe.listen(0, '127.0.0.1', r)); const port = (probe.address() as { port: number }).port; await new Promise<void>(r => probe.close(() => r()));
  const host = await startAutomationReference(port);
  const vite = await createServer({ configFile: config, server: { host: '127.0.0.1', port, strictPort: true, proxy: { '/api': { target: host.origin } } } });
  await vite.listen(); cleanup.push(() => vite.close());
  let playwright; try { playwright = createRequire(import.meta.url)('playwright'); } catch { playwright = createRequire(path.resolve('../ui-base/package.json'))('playwright'); }
  const browser = await playwright.chromium.launch({ channel: 'msedge', headless: true }); cleanup.push(() => browser.close());
  const page = await browser.newPage(); return { host, page, origin: `http://127.0.0.1:${port}` };
}
it('unsigned Form submission shows a sign-in message without running automation', async () => {
  const { host, page, origin } = await reference();
  await page.goto(origin);
  expect(await page.getByRole('button', { name: 'Activate saved Person' }).isDisabled()).toBe(true);
  await page.getByLabel('firstName', { exact: true }).fill('Unsigned'); await page.getByLabel('lastName', { exact: true }).fill('Person'); await page.getByLabel('email', { exact: true }).fill('unsigned@example.test');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.getByText('Sign in before submitting.', { exact: false }).waitFor({ timeout: 15000 });
  expect(host.runtime.audit.list()).toHaveLength(0);
  await page.getByRole('button', { name: 'Sign in as development admin' }).click();
  await page.getByText('Development admin signed in').waitFor({ timeout: 15000 });
  expect(await page.getByLabel('firstName', { exact: true }).inputValue()).toBe('Unsigned');
}, 60000);
it('real browser Form success and Page button invoke the permanent Workflow through trusted identity and protected persisted DOE', async () => {
  const { host, page, origin } = await reference(); const errors: string[] = [];
  const responses: string[] = []; page.on('response', async (response: any) => { if (/\/api\/application-data\//.test(response.url())) { const index = responses.push(`${response.status()} ${response.url()}`) - 1; responses[index] += ` ${await response.text().catch(() => '')}`; } });
  page.on('pageerror', (e: Error) => errors.push(String(e)));
  await page.goto(origin);
  await page.getByRole('button', { name: 'Sign in as development admin' }).click(); await page.getByText('Development admin signed in').waitFor({ timeout: 45000 });
  await page.getByLabel('firstName', { exact: true }).fill('Ada'); await page.getByLabel('lastName', { exact: true }).fill('Lovelace'); await page.getByLabel('email', { exact: true }).fill('ada@example.test');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.getByLabel('Current saved record', { exact: true }).filter({ hasText: 'Ada' }).waitFor({ timeout: 45000 }).catch(async (error: Error) => { throw new Error(String(error) + '\n' + responses.join('\n') + '\n' + JSON.stringify(await page.locator('[data-uip-node=submit-error]').allTextContents()) + '\n' + errors.join('\n') + '\n' + await page.locator('body').innerText()); });
  await expect.poll(() => page.getByLabel('Saved person', { exact: true }).innerText(), { timeout: 45000 }).toContain('Ada Lovelace ada@example.test');
  await expect.poll(() => page.locator('[data-uip-node="activation-message"]').innerText(), { timeout: 45000 }).toContain('Activation completed for Ada Lovelace.');
  expect(await page.getByRole('button', { name: 'Activate saved Person' }).isDisabled()).toBe(false);
  expect(await page.locator('[data-uip-node="saved-status"]').innerText()).toBe('active');
  expect(await page.getByLabel('Current saved record', { exact: true }).innerText()).toContain('"status": "active"');
  await expect.poll(() => page.locator('[data-uip-node="workflow-success"]').innerText(), { timeout: 90000 }).toBe('true').catch(async (error: Error) => { throw new Error(String(error) + '\n' + responses.join('\n') + '\n' + JSON.stringify(host.runtime.audit.list()) + '\n' + await page.locator('[data-uip-node="workflow-error"]').innerText() + '\n' + errors.join('\n')); });
  expect(await page.locator('[data-uip-node="workflow-steps"]').innerText()).toBe('3');
  const id = await page.locator('[data-uip-node="record-id"]').innerText(); expect(id).not.toBe('');
  const dataFile = path.join(host.ormData, 'dev-v1-identity-fixture__default__people.json');
  let rows = JSON.parse(await readFile(dataFile, 'utf8')); expect(rows.find((r: any) => r.id === id)).toMatchObject({ firstName: 'Ada', status: 'active' });
  expect(rows.filter((r: any) => r.status === 'history')).toHaveLength(2);
  const count = host.runtime.audit.list().filter(a => a.kind === 'workflow' && a.completedSteps === 3 && !a.actionId).length;
  await page.getByRole('button', { name: 'Activate saved Person' }).click();
  expect(await page.getByRole('button', { name: 'Activate saved Person' }).isDisabled()).toBe(true);
  expect(await page.locator('[data-uip-node="activation-message"]').innerText()).toContain('Activating Ada Lovelace');
  expect(await page.locator('[data-uip-node="workflow-success"]').innerText()).toBe('');
  await expect.poll(() => host.runtime.audit.list().filter(a => a.kind === 'workflow' && a.completedSteps === 3 && !a.actionId).length, { timeout: 45000 }).toBe(count + 1);
  rows = JSON.parse(await readFile(dataFile, 'utf8')); expect(rows.filter((r: any) => r.status === 'history')).toHaveLength(4);
  await expect.poll(() => page.locator('[data-uip-node="activation-message"]').innerText(), { timeout: 45000 }).toContain('Activation completed for Ada Lovelace.');
  expect(await page.locator('[data-uip-node="activation-time"]').innerText()).not.toBe('');
  await page.route('**/api/application-data/workflows', (route: any) => route.fulfill({ status: 503, body: '' }));
  await page.getByRole('button', { name: 'Activate saved Person' }).click();
  await expect.poll(() => page.locator('[data-uip-node="activation-message"]').innerText()).toContain('Activation could not be confirmed:');
  expect(await page.getByRole('button', { name: 'Activate saved Person' }).isDisabled()).toBe(false);
  expect(await page.locator('[data-uip-node="workflow-success"]').innerText()).toBe('');
  await page.unroute('**/api/application-data/workflows');
  const forged = await page.evaluate(async () => fetch('/api/application-data/workflows', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workflowId: 'wfl_person_activation_v1', primaryRecordId: 'fake', actor: { type: 'system' }, grants: ['*'] }) }).then(r => r.status)); expect(forged).toBe(403);
  const prohibited = await page.evaluate(async (id: string) => fetch('/api/application-data/operations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ datasetId: 'dataset-person-form-reference', operation: 'update', records: [{ id, internalNotes: 'forged' }] }) }).then(r => r.json()), id);
  expect(prohibited).toMatchObject({ success: false, committed: false });
  (host.runtime.services as Map<string, any>).set('reference.notification', { transactional: false, async invoke() { throw new Error('NOTIFICATION_FAILED'); } });
  const postFailed = await page.evaluate(async () => fetch('/api/application-data/operations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ datasetId: 'dataset-person-form-reference', operation: 'insert', records: [{ id: 'committed-notification-failure', firstName: 'Committed', lastName: 'Person', email: 'committed@example.test' }] }) }).then(r => r.json()));
  expect(postFailed).toMatchObject({ success: false, committed: true, data: { success: true, committed: true }, afterCommit: { success: false }, repeatWriteMayDuplicate: true });
  expect(await readFile(dataFile, 'utf8')).toContain('committed-notification-failure'); expect(errors).toEqual([]);
}, 180000);

it('reference launcher exposes its protected management page', async () => {
  const { page, origin } = await reference(); await page.goto(origin + '/manage.html');
  await Promise.all([page.waitForNavigation(), page.getByLabel('Development identity').selectOption('security@example.local')]);
  await page.getByRole('button', { name: 'Manage Triggers and Workflows' }).click();
  await page.getByLabel('Automation artifact', { exact: true }).waitFor({ timeout: 45000 });
  await expect.poll(() => page.getByLabel('Automation artifact', { exact: true }).innerText(), { timeout: 45000 }).toContain('Person default status');
}, 60000);

it('management browser edits, reloads disk source, retains conflicts and deletes a native legacy fixture under Platform authorization', async () => {
  const { host, page, origin } = await reference('vite.config.ts');
  await page.goto(origin); await Promise.all([page.waitForNavigation(), page.getByLabel('Development identity').selectOption('security@example.local')]);
  await page.getByRole('button', { name: 'Manage Triggers and Workflows' }).click();
  await page.getByLabel('Automation artifact', { exact: true }).waitFor({ timeout: 15000 }).catch(async (error: Error) => { throw new Error(String(error) + '\n' + JSON.stringify(await page.locator('[data-uip-node=submit-error]').allTextContents()) + '\n' + errors.join('\n') + '\n' + await page.locator('body').innerText()); });
  await page.locator('[data-create]').waitFor({ timeout: 10000 }).catch(async (error: Error) => { throw new Error(String(error) + '\n' + JSON.stringify(await page.locator('[data-uip-node=submit-error]').allTextContents()) + '\n' + errors.join('\n') + '\n' + await page.locator('body').innerText()); });
  const name = `browser-proof-${Date.now()}`;
  // This historical reference host has no approved normal-host authoring catalog.
  // Native fixture setup preserves lifecycle coverage; WP5-C's normal-host browser test proves typed UI creation.
  const { AutomationStore } = await import('../src/server/automation-store.js');
  await new AutomationStore(path.resolve('triggers'), 'trigger').create(name, { displayName: name, appId: 'dev-v1-identity-fixture', datasetId: 'dataset-person-form-reference', dataset: 'people', primaryKey: 'id', enabled: false, phase: 'beforeInsert', actions: [] });
  page.on('dialog', (dialog: any) => dialog.accept());
  await page.getByRole('button', { name: 'Refresh list', exact: true }).click();
  await page.getByLabel('Automation artifact', { exact: true }).selectOption(`${name}/trigger.json`);
  await expect.poll(() => page.locator('[data-properties]').innerText(), { timeout: 45000 }).toContain('Permanent ID');
  const file = path.resolve('triggers', name, 'trigger.json');
  if (!file.startsWith(path.resolve('triggers') + path.sep) || !/^browser-proof-\d+$/.test(name)) throw new Error('Unexpected test artifact path.');
  cleanup.push(() => rm(path.dirname(file), { recursive: true, force: true }));
  const created = JSON.parse(await readFile(file, 'utf8'));
  await page.locator('input[data-property="displayName"]').fill('Browser edited Trigger'); await page.getByRole('button', { name: 'Save Now', exact: true }).click();
  await expect.poll(async () => JSON.parse(await readFile(file, 'utf8')).displayName, { timeout: 45000 }).toBe('Browser edited Trigger');
  const disk = JSON.parse(await readFile(file, 'utf8')); await writeFile(file, JSON.stringify({ ...disk, displayName: 'External edit' }, null, 2));
  await expect.poll(() => page.locator('input[data-property="displayName"]').inputValue(), { timeout: 45000 }).toBe('External edit');
  await page.locator('input[data-property="displayName"]').fill('Local retained'); await writeFile(file, JSON.stringify({ ...disk, displayName: 'Conflict disk edit' }, null, 2));
  await expect.poll(() => page.locator('[data-status]').innerText(), { timeout: 45000 }).toContain('Conflict');
  expect(await page.getByRole('button', { name: 'Save Now', exact: true }).isDisabled()).toBe(true);
  await page.getByRole('button', { name: 'Reload / discard local edits' }).click();
  await expect.poll(() => page.locator('input[data-property="displayName"]').inputValue(), { timeout: 45000 }).toBe('Conflict disk edit');
  expect(JSON.parse(await readFile(file, 'utf8')).id).toBe(created.id);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect.poll(() => stat(file).then(() => true, () => false), { timeout: 45000 }).toBe(false);
  await expect.poll(() => page.getByLabel('Automation artifact', { exact: true }).locator(`option[value="${name}/trigger.json"]`).count(), { timeout: 45000 }).toBe(0);
  await Promise.all([page.waitForNavigation(), page.getByLabel('Development identity').selectOption('workflow-editor@example.local')]);
  const denied = await page.evaluate(() => fetch('/api/automation/triggers').then(r => r.status)); expect(denied).toBe(403);
}, 180000);
