import '@ui-base/ui';
import manifest from '../../node_modules/@ui-base/ui/ui.component.json';
import { mountVisualArtifact } from '@ui-platform/visual-artifacts/runtime';
import type { ArtifactInstance } from '@ui-platform/visual-artifacts/runtime';
import { ApplicationDataClient, createSessionApplicationDataTransport } from '@uib/platform-core/application-data';
import { mountVisualEditor } from '../../src/client/visual-artifacts/editor';
import type { ArtifactBundle, ArtifactMetadata, PackageComponent, RuntimeArtifact } from '@ui-platform/visual-artifacts';

const sources = import.meta.glob('../../components/**/*', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const pageSources = import.meta.glob('../../references/visual-artifacts/src/pages/customers/*', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
function bundle(prefix: string, source: Record<string, string>, name = 'component'): ArtifactBundle {
  const files = { source: source[`${prefix}/${name}.html`], css: source[`${prefix}/${name}.css`], metadata: source[`${prefix}/${name}.visual.json`], fixtures: source[`${prefix}/${name}.fixtures.json`], code: source[`${prefix}/${name}.functions.ts`] };
  return { locator: prefix.split('/').at(-1) + `/${name}.visual.json`, files, metadata: JSON.parse(files.metadata), hash: 'initial', diagnostics: [] };
}
const bundles = ['customer-summary-card', 'customer-list-item'].map(name => bundle(`../../components/${name}`, sources));
const pageBundle = bundle('../../references/visual-artifacts/src/pages/customers', pageSources, 'page');
const runtime = (b: ArtifactBundle): RuntimeArtifact => ({ metadata: b.metadata!, source: b.files.source, css: b.files.css });
const components = bundles.map(runtime);
const packages = manifest.components.map(entry => ({ ...entry, id: 'identity' in entry ? entry.identity.componentId : `@ui-base/ui:${entry.tagName}`, definition: 'identity' in entry ? entry : undefined })) as unknown as PackageComponent[];
const fixture = document.querySelector('#fixture')!;
const results = document.querySelector('#results')!;
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const wait = async (check: () => boolean) => { for (let index = 0; index < 150; index++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 20)); } throw new Error('Timed out waiting for browser state'); };
async function test(name: string, run: () => void | Promise<void>) {
  const item = document.createElement('li'); results.append(item);
  try { await run(); item.textContent = `PASS: ${name}`; }
  catch (error) { item.textContent = `FAIL: ${name}: ${String(error)}`; throw error; }
}
const mount = (artifact: RuntimeArtifact, inputs?: Record<string, unknown>) => { const instance = mountVisualArtifact(artifact, { components, packages, inputs }); fixture.replaceChildren(instance.host); return instance; };
const innerSummary = (instance: ArtifactInstance) => instance.root.querySelector<HTMLElement>('[data-uip-artifact="art_customer-list-item-reference"]')!.shadowRoot!.querySelector<HTMLElement>('[data-uip-artifact="art_customer-summary-reference"]')!.shadowRoot!;
try {
  await test('Actual uib-card and additional Package Components render public properties', () => {
    const instance = mount(components[0], JSON.parse(bundles[0].files.fixtures).public);
    const card = instance.root.querySelector('uib-card')!;
    assert(card.shadowRoot && card.getAttribute('heading') === 'Acme', 'Real card missing or binding failed');
    assert(instance.root.querySelector('uib-heading')?.shadowRoot, 'Real heading not rendered');
    assert(instance.root.querySelector('button'), 'Ordinary HTML action not rendered');
    instance.destroy();
  });
  await test('Page → nested Platform Components → real Package Components, repeaters and events', async () => {
    const instance = mount(runtime(pageBundle));
    assert(instance.root.querySelectorAll('[data-uip-artifact="art_customer-list-item-reference"]').length === 2, 'Repeater failed');
    const summary = innerSummary(instance);
    assert(!summary.querySelector('[data-uip-node="summary-details"]'), 'Condition should initially hide details');
    summary.querySelector<HTMLButtonElement>('button')!.click();
    await wait(() => instance.state.selectedCustomer === 'acme');
    assert(instance.root.querySelector('[data-uip-node="selected-label"]')?.textContent === 'acme', 'Page event binding not updated');
    assert(innerSummary(instance).querySelector('[data-uip-node="summary-details"]')?.textContent?.includes('125.5'), 'Local state lost across parent update');
    assert(instance.root.querySelector('uib-card')?.shadowRoot, 'Direct Page package path missing');
    innerSummary(instance).querySelector<HTMLButtonElement>('button')!.click();
    await wait(() => !innerSummary(instance).querySelector('[data-uip-node="summary-details"]'));
    assert(instance.state.selectedCustomer === 'acme', 'Repeated events lost Page state');
    instance.destroy();
  });
  await test('Public event payload and public slot projection use actual runtime boundaries', async () => {
    const slotContent = document.createElement('strong'); slotContent.slot = 'footer'; slotContent.textContent = 'Projected footer';
    const instance = mountVisualArtifact(components[0], { components, packages, inputs: JSON.parse(bundles[0].files.fixtures).public, slots: [slotContent] }); fixture.replaceChildren(instance.host);
    let payload: unknown; let leaked = false;
    instance.host.addEventListener('openRequested', event => { payload = (event as CustomEvent).detail; });
    instance.host.addEventListener('click', () => { leaked = true; });
    instance.root.querySelector<HTMLButtonElement>('button')!.click();
    await wait(() => Boolean(payload));
    assert(JSON.stringify(payload) === '{"customerId":"acme"}', 'Public payload shape mismatch');
    assert(!leaked, 'Private event escaped boundary');
    const slot = instance.root.querySelector<HTMLSlotElement>('slot[name="footer"]')!;
    assert(slot.assignedNodes().includes(slotContent), 'Public slot did not project content');
    instance.destroy();
  });
  await test('Page CSS, instance CSS and outside CSS cannot penetrate nested artifact internals', () => {
    const a = mountVisualArtifact(components[0], { components, packages, inputs: JSON.parse(bundles[0].files.fixtures).public });
    const b = mountVisualArtifact({ ...components[0], css: 'article { color: rgb(0, 128, 0); }' }, { components, packages, inputs: JSON.parse(bundles[0].files.fixtures).public });
    fixture.replaceChildren(a.host, b.host);
    const outside = document.createElement('style'); outside.textContent = 'article { color: rgb(255, 0, 0) !important; }'; document.head.append(outside);
    assert(getComputedStyle(a.root.querySelector('article')!).color === 'rgb(22, 50, 79)', 'Outside stylesheet leaked');
    assert(getComputedStyle(b.root.querySelector('article')!).color === 'rgb(0, 128, 0)', 'Instance styles not isolated');
    const page = mount(runtime(pageBundle)); const heading = innerSummary(page).querySelector('uib-heading')!;
    assert(getComputedStyle(heading).getPropertyValue('--uib-heading-color').trim() !== 'red', 'Page selector reached private heading');
    outside.remove(); a.destroy(); b.destroy(); page.destroy();
  });
  await test('Real application Dataset client executes a named-source adapter; no implicit persistence', async () => {
    const requests: unknown[] = [];
    const client = new ApplicationDataClient(createSessionApplicationDataTransport({ fetch: async (url, init) => { requests.push({ url, intent: JSON.parse(String(init?.body)) }); return Response.json({ customerCount: 2 }); } }));
    const metadata: ArtifactMetadata = { schemaVersion: 1, artifactId: 'art_data-reference', kind: 'page', name: 'data-reference', displayName: 'Data reference', route: '/data', state: { count: 0 }, sources: { query: { kind: 'service', reference: 'dataset:customer-count' } }, bindings: [{ node: 'count', target: 'text', value: 'query.customerCount' }] };
    const instance = mountVisualArtifact({ metadata, source: '<p data-uip-node="count"></p>', css: '' }, { components, packages, services: { 'dataset:customer-count': () => client.count('customers') } }); fixture.replaceChildren(instance.host);
    await wait(() => instance.root.querySelector('p')?.textContent === '2');
    assert(requests.length === 1 && JSON.stringify(requests[0]).includes('"mode":"count"'), 'Existing Dataset adapter was not used');
    assert(!JSON.stringify(requests).includes('operations'), 'Unexpected persistence'); instance.destroy();
  });
  await test('Optional trusted named functions use the current artifact context', async () => {
    const metadata: ArtifactMetadata = { schemaVersion: 1, artifactId: 'art_code', kind: 'page', name: 'code', displayName: 'Code', route: '/code', state: { count: 0 }, bindings: [{ node: 'count', target: 'text', value: 'local.count' }], events: [{ node: 'button', event: 'click', actions: [{ kind: 'function', name: 'increment' }] }] };
    const instance = mount({ metadata, source: '<button data-uip-node="button">Increment</button><span data-uip-node="count"></span>', css: '', functions: { increment: context => context.setState('count', Number(context.local.count) + 1) } });
    instance.root.querySelector<HTMLButtonElement>('button')!.click(); await wait(() => instance.root.querySelector('span')?.textContent === '1'); instance.destroy();
  });
  await test('Shared editor insertion, source save/reopen, automatic external reload and conflict recovery', async () => {
    let disk = structuredClone(pageBundle), saveCount = 0;
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith('/visual-artifacts')) return Response.json({ pages: [disk], components: bundles, packages });
      if (url.includes('/visual-pages?')) {
        if (init?.method === 'PUT') { const body = JSON.parse(String(init.body)); if (body.expectedHash !== disk.hash) return Response.json({ error: 'changed on disk' }, { status: 409 }); disk.files[body.role as keyof typeof disk.files] = body.content; disk.hash = `save-${++saveCount}`; return Response.json(disk); }
        return Response.json(disk);
      }
      return originalFetch(input, init);
    };
    const editor = document.createElement('div'); fixture.replaceChildren(editor); await mountVisualEditor(editor, 'fixture');
    const select = editor.querySelector<HTMLSelectElement>('[data-artifacts]')!; select.value = `page:${disk.locator}`; select.dispatchEvent(new Event('change'));
    editor.querySelector<HTMLButtonElement>('[data-add]')!.click();
    assert(editor.querySelector<HTMLTextAreaElement>('[data-source]')!.value.includes('node_'), 'Insertion did not persist source IDs');
    editor.querySelector<HTMLButtonElement>('[data-save]')!.click(); await wait(() => saveCount === 1); await wait(() => !editor.querySelector('[data-work]')!.hasAttribute('inert'));
    disk.files.source += '\n<p>External reload proof</p>'; disk.hash = 'external-1';
    document.dispatchEvent(new Event('ui-platform-workspace-change')); await wait(() => editor.querySelector<HTMLTextAreaElement>('[data-source]')!.value.includes('External reload proof'));
    const textarea = editor.querySelector<HTMLTextAreaElement>('[data-source]')!; textarea.value += '\n<!-- Unsaved editor work -->'; textarea.dispatchEvent(new Event('input'));
    disk.files.css = 'p {color: blue}'; disk.hash = 'external-2';
    document.dispatchEvent(new Event('ui-platform-workspace-change')); await wait(() => editor.textContent!.includes('External changes conflict'));
    assert(editor.querySelector<HTMLButtonElement>('[data-save]')!.disabled, 'Stale save was enabled');
    assert(textarea.value.includes('Unsaved editor work'), 'Unsaved work was lost'); assert(editor.querySelector('[data-recover]'), 'Recovery unavailable');
    window.fetch = originalFetch; editor.remove();
  });
  document.body.dataset.result = 'passed';
} catch (error) { document.body.dataset.result = 'failed'; console.error(error); }
