import { afterEach, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import type { ViteDevServer } from 'vite';
import { runtimeRefreshClient, runtimeRefreshModule, runtimeRevisionRefresh } from '../packages/visual-artifacts/src/runtime-revision.js';

afterEach(() => vi.useRealTimers());
const id = '\0virtual:uip-application-composition';
function client(data: Record<string, unknown> = {}) {
  let receive: (value: unknown) => void = () => {};
  const reload = vi.fn();
  const hot = { data, accept() {}, on(_event: string, handler: typeof receive) { receive = handler; } };
  const register = new Function('hot', 'location', runtimeRefreshClient.replaceAll('import.meta.hot', 'hot').replace('export function register', 'function register') + '\nreturn register;')(hot, { reload });
  return { register, reload, data, receive: (modules: Record<string, string>, force = false) => receive({ modules, force }) };
}
function host() {
  const watcher = new EventEmitter(), httpServer = new EventEmitter();
  const module = { id };
  const load = vi.fn(async () => runtimeRefreshModule('virtual:uip-composition-watch', id, 'complete graph'));
  const send = vi.fn(), invalidateModule = vi.fn();
  const server = { watcher, httpServer, pluginContainer: { load }, moduleGraph: { idToModuleMap: new Map([[id, module], ['\0virtual:uip-visual-watch', { id: '\0virtual:uip-visual-watch' }]]), invalidateModule }, ws: { send } } as unknown as ViteDevServer;
  const refresh = runtimeRevisionRefresh(server, () => true, file => file.endsWith('.html'));
  return { watcher, load, send, invalidateModule, refresh };
}
it('retains an already-current browser and reloads an older browser independently', () => {
  const current = client(), old = client();
  current.register(id, 'new'); old.register(id, 'old');
  current.receive({ [id]: 'new' }); old.receive({ [id]: 'new' });
  expect(current.reload).not.toHaveBeenCalled(); expect(old.reload).toHaveBeenCalledOnce();
});
it('reconciles an event received during module bootstrap and retains digest state across sentinel HMR', () => {
  const before = client(); before.receive({ [id]: 'same' }); before.register(id, 'same');
  const after = client(before.data); after.receive({ [id]: 'same' });
  expect(before.reload).not.toHaveBeenCalled(); expect(after.reload).not.toHaveBeenCalled();
  const staleBootstrap = client(); staleBootstrap.receive({ [id]: 'new' }); staleBootstrap.register(id, 'old');
  expect(staleBootstrap.reload).toHaveBeenCalledOnce();
  const forcedBootstrap = client(); forcedBootstrap.receive({ [id]: 'same' }, true); forcedBootstrap.receive({ [id]: 'same' }); forcedBootstrap.register(id, 'same');
  expect(forcedBootstrap.reload).toHaveBeenCalledOnce();
});
it('does not transfer runtime state or act on unrelated modules, and forces asset/helper refresh', () => {
  const active = client(); active.register(id, 'same');
  active.receive({ unrelated: 'other' }, true); expect(active.reload).not.toHaveBeenCalled();
  active.receive({ [id]: 'same' }, true); expect(active.reload).toHaveBeenCalledOnce();
  // A new document has no shared active generation or persisted payload.
  const fresh = client(); fresh.receive({ [id]: 'same' }); expect(fresh.reload).not.toHaveBeenCalled();
});
it('validates on every event and sends the exact compiled digest without reloading a matching client', async () => {
  vi.useFakeTimers(); const h = host();
  const active = client(); active.register(id, runtimeRefreshModule('watch', id, 'complete graph').meta.uipVisualRefreshDigest);
  h.watcher.emit('change', 'page.html'); await vi.advanceTimersByTimeAsync(200);
  expect(h.load).toHaveBeenCalledOnce(); expect(h.invalidateModule).toHaveBeenCalledOnce();
  const message = h.send.mock.calls[0][0]; expect(message).toMatchObject({ type: 'custom', event: 'uip:validated-visual-refresh', data: { force: false } });
  active.receive(message.data.modules, message.data.force); expect(active.reload).not.toHaveBeenCalled();
  h.refresh.close();
});
it('does not lose an uncaptured helper/asset event when coalescing a captured source event', async () => {
  vi.useFakeTimers(); const h = host(); h.refresh.refresh('helper.ts'); h.refresh.refresh('page.html');
  await vi.advanceTimersByTimeAsync(200); expect(h.send.mock.calls[0][0].data.force).toBe(true);
  h.refresh.refresh('page.html'); await vi.advanceTimersByTimeAsync(200); expect(h.send.mock.calls[1][0].data.force).toBe(false);
  h.refresh.close();
});
it('ignores only captured source-role atomic siblings, not genuine helper or asset changes', async () => {
  vi.useFakeTimers(); const h = host();
  h.refresh.refresh('page.html.12345678-1234-1234-1234-123456789abc.tmp');
  await vi.advanceTimersByTimeAsync(200); expect(h.load).not.toHaveBeenCalled();
  h.refresh.refresh('asset.12345678-1234-1234-1234-123456789abc.tmp');
  await vi.advanceTimersByTimeAsync(200); expect(h.send.mock.calls[0][0].data.force).toBe(true);
  h.refresh.close();
});
it('keeps the current page on failed validation and does not publish stale validation after a newer event', async () => {
  vi.useFakeTimers(); const h = host(); h.load.mockRejectedValueOnce(new Error('recovery required'));
  h.refresh.refresh('page.html'); await vi.advanceTimersByTimeAsync(200);
  expect(h.send.mock.calls[0][0]).toMatchObject({ type: 'error' });
  let finish!: (value: ReturnType<typeof runtimeRefreshModule>) => void;
  h.load.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  h.refresh.refresh('page.html'); await vi.advanceTimersByTimeAsync(200);
  h.refresh.refresh('new.html'); finish(runtimeRefreshModule('watch', id, 'obsolete'));
  await vi.advanceTimersByTimeAsync(200);
  expect(h.send.mock.calls.filter(([m]) => m.type === 'custom')).toHaveLength(1);
  expect(h.send.mock.calls[1][0].data.modules[id]).toBe(runtimeRefreshModule('watch', id, 'complete graph').meta.uipVisualRefreshDigest);
  h.refresh.close();
});
