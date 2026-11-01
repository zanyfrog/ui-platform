import assert from 'node:assert/strict';

export async function verifyProtocol(Window, code, bundles) {
  const messages = [], calls = [];
  const parent = { postMessage: data => messages.push(structuredClone(data)) };
  const initial = bundles[0], other = bundles[1];
  const query = new URLSearchParams({ app: 'fixture', kind: 'page', locator: initial.locator, revision: initial.hash, design: '1', session: 'retired-session' });
  const w = new Window({ url: 'http://fixture.invalid/visual-preview.html?' + query });
  w.structuredClone = structuredClone; w.crypto = globalThis.crypto;
  Object.defineProperty(w, 'parent', { value: parent });
  w.document.body.innerHTML = '<div id="preview"></div><pre id="events"></pre>';
  let holdList = false, releaseList, refuseRevision = false;
  w.fetch = async input => {
    const url = new URL(String(input), w.location.href); calls.push(url.pathname + url.search);
    if (!url.searchParams.has('preview')) {
      if (holdList) { holdList = false; await new Promise(resolve => { releaseList = resolve; }); }
      return { ok: true, json: async () => bundles };
    }
    const bundle = bundles.find(item => item.locator === url.searchParams.get('locator'));
    const ok = !refuseRevision && bundle?.hash === url.searchParams.get('hash');
    return { ok, json: async () => ok ? { bundle, components: [], packages: [], shells: [], code: {}, composition: null } : { error: 'Saved revision changed' } };
  };
  const settle = async () => { for (let i = 0; i < 20; i++) await new Promise(resolve => setTimeout(resolve, 2)); };
  const send = (session, source = parent, origin = w.location.origin) => w.dispatchEvent(new w.MessageEvent('message', { source, origin, data: { type: 'uip-preview', design: true, appKey: 'fixture', locator: other.locator, hash: other.hash, kind: 'page', session } }));
  try {
    w.eval(code); await settle(); assert.equal(calls.length, 0, 'embedded Reload must await current-document parent admission');
    send('foreign', {}, 'https://foreign.invalid'); await settle(); assert.equal(calls.length, 0);
    send('fresh-document-session'); await settle();
    assert.equal(messages.at(-1).state, 'mounted'); assert.equal(messages.at(-1).locator, initial.locator, 'Reload preserves iframe history Page, not parent requested Page');
    assert.equal(messages.at(-1).session, 'fresh-document-session');
    const root = () => w.document.querySelector('[data-uip-artifact]').shadowRoot;
    holdList = true; root().querySelector('a').click(); await settle();
    assert.equal(messages.at(-1).state, 'loading');
    root().querySelector('a').click(); await settle();
    assert.equal(messages.at(-1).state, 'mounted'); assert.equal(messages.at(-1).locator, other.locator);
    const completed = structuredClone(messages); releaseList(); await settle(); assert.deepEqual(messages, completed, 'late navigation lookup cannot replace newer mount or report ready');
    const retained = w.document.querySelector('[data-uip-artifact]'), url = w.location.href;
    refuseRevision = true; root().querySelector('a').click(); await settle();
    assert.equal(messages.at(-1).state, 'blocked'); assert.match(messages.at(-1).error, /Saved revision changed/);
    assert.equal(retained.isConnected, true); assert.equal(w.location.href, url);
    send('duplicate'); await settle(); assert.equal(messages.at(-1).state, 'blocked', 'a duplicate parent request cannot reset an initialized document');
    return { passed: true, scope: 'Actual Preview client/runtime in isolated DOM; fake source transport', messages, calls, embeddedReloadAdmission: true, currentHistoryContext: true, outOfOrderNavigation: true, failedRevisionRetainsPage: true };
  } finally { await w.happyDOM.close(); }
}
