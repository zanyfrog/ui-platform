import { afterEach, expect, it, vi } from 'vitest';
const session = vi.hoisted(() => ({ valid: true }));
vi.mock('../src/client/artifact-editor/session.js', () => ({
  refreshEditorSession: async () => {},
  createEditorSessionBinding: () => ({ headers: async () => ({ 'x-editor-revision': 'original' }), assert() { if (!session.valid) throw new Error('Original session revoked'); } }),
}));
import { workspaceRequest } from '../src/client/builder-workspace/requests.js';
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); session.valid = true; });
const response = (status: number, value: unknown) => ({ status, ok: status === 200, json: async () => value });
it('busy read admission retries under the original session and only returns an authorized response', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockResolvedValueOnce(response(503, { code: 'WORKSPACE_SOURCE_BUSY' })).mockResolvedValueOnce(response(200, { authorized: true }));
  vi.stubGlobal('fetch', fetch);
  const result = workspaceRequest('application'); await vi.advanceTimersByTimeAsync(100);
  expect(await result).toEqual({ authorized: true }); expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls.every((call: any[]) => call[1].headers['x-editor-revision'] === 'original')).toBe(true);
});
it('a revoked original session cannot send another authorization read during a busy retry', async () => {
  vi.useFakeTimers(); const fetch = vi.fn().mockImplementation(async () => { session.valid = false; return response(503, { code: 'WORKSPACE_SOURCE_BUSY' }); });
  vi.stubGlobal('fetch', fetch); await expect(workspaceRequest('application')).rejects.toThrow('Original session revoked'); expect(fetch).toHaveBeenCalledTimes(1);
});
it('permission denial and incomplete/corrupt source failures never retry', async () => {
  for (const status of [403, 503]) {
    const fetch = vi.fn().mockResolvedValue(response(status, { code: 'WORKSPACE_TARGET_DENIED', error: 'Denied' })); vi.stubGlobal('fetch', fetch);
    await expect(workspaceRequest('application')).rejects.toThrow('Denied'); expect(fetch).toHaveBeenCalledTimes(1);
  }
});
it('persistent source contention reaches its bound and fails without returning stale authorization', async () => {
  vi.useFakeTimers(); const fetch = vi.fn().mockResolvedValue(response(503, { code: 'WORKSPACE_SOURCE_BUSY', error: 'Still busy' })); vi.stubGlobal('fetch', fetch);
  const result = expect(workspaceRequest('application')).rejects.toThrow('Still busy'); await vi.advanceTimersByTimeAsync(2000); await result;
  expect(fetch).toHaveBeenCalledTimes(20);
});
