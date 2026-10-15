import { afterEach, expect, it, vi } from 'vitest';
import { EditingLifecycle, protectEditingDraft } from '../src/client/artifact-editor/editing-lifecycle.js';
afterEach(() => vi.useRealTimers());
it('debounces only changes, and does not write a candidate that has returned to baseline', async () => {
  vi.useFakeTimers(); const save = vi.fn(async (value: string) => value), copy = new EditingLifecycle('a', save);
  copy.edit('b', 'typing'); await vi.advanceTimersByTimeAsync(1900); copy.edit('c', 'typing');
  await vi.advanceTimersByTimeAsync(1999); expect(save).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1); expect(save).toHaveBeenCalledExactlyOnceWith('c', 'a');
  copy.edit('c'); await copy.flush(); expect(save).toHaveBeenCalledOnce();
  copy.edit('temporary'); copy.undo(); await vi.advanceTimersByTimeAsync(2000); expect(save).toHaveBeenCalledOnce();
  await copy.dispose();
});
it('keeps logical undo history after save and permits undo/redo independent of focus', async () => {
  const save = vi.fn(async (value: { node: string; x: number }) => value);
  const copy = new EditingLifecycle({ node: 'stable-id', x: 0 }, save);
  copy.edit({ node: 'stable-id', x: 1 }); await copy.flush();
  copy.undo(); expect(copy.current).toEqual({ node: 'stable-id', x: 0 }); await copy.flush();
  copy.redo(); expect(copy.current).toEqual({ node: 'stable-id', x: 1 });
  expect(copy.canUndo).toBe(true); expect(save).toHaveBeenCalledTimes(2); await copy.dispose();
});
it('groups a typing burst but separates different controls and later edits', async () => {
  vi.useFakeTimers(); const copy = new EditingLifecycle('', async value => value);
  copy.edit('a', 'field:a'); copy.edit('ab', 'field:a'); copy.edit('abc', 'field:b');
  copy.undo(); expect(copy.current).toBe('ab'); copy.undo(); expect(copy.current).toBe('');
  copy.redo(); await vi.advanceTimersByTimeAsync(751); copy.edit('abcd', 'field:a');
  expect(copy.canRedo).toBe(false); copy.undo(); expect(copy.current).toBe('ab'); await copy.dispose();
});
it('bounds retained history by entry count and estimated memory', async () => {
  const copy = new EditingLifecycle('', async value => value, undefined, { entries: 3, bytes: 30 });
  for (let n = 1; n < 20; n++) copy.edit(String(n).repeat(4));
  expect(copy.historySize.entries).toBeLessThanOrEqual(3); expect(copy.historySize.bytes).toBeLessThanOrEqual(30);
  copy.edit('x'.repeat(100)); copy.edit('next');
  expect(copy.historySize.bytes).toBeLessThanOrEqual(30); await copy.dispose();
});
it('retains invalid drafts without retry loops and resumes after correction', async () => {
  vi.useFakeTimers(); const save = vi.fn(async (value: string) => { if (value === '{') throw Object.assign(new Error('Invalid JSON'), { status: 422 }); return value; });
  const copy = new EditingLifecycle('{}', save); copy.edit('{'); await vi.advanceTimersByTimeAsync(2000);
  expect(copy.state).toBe('pending'); expect(copy.failure).toBe('Invalid JSON'); expect(copy.current).toBe('{'); expect(copy.baseline).toBe('{}');
  await vi.advanceTimersByTimeAsync(20000); expect(save).toHaveBeenCalledOnce();
  copy.resume(); copy.suspend(); copy.resume(); await vi.advanceTimersByTimeAsync(5000); expect(save).toHaveBeenCalledOnce();
  copy.edit('{"valid":true}'); await vi.advanceTimersByTimeAsync(2000); expect(copy.state).toBe('saved'); await copy.dispose();
});
it('preserves newer edits during a delayed response, then saves using the new baseline', async () => {
  vi.useFakeTimers(); let complete!: (value: string) => void;
  const save = vi.fn(async (value: string) => value).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  const copy = new EditingLifecycle('initial', save); copy.edit('first'); const saving = copy.flush(); copy.edit('newest');
  await vi.advanceTimersByTimeAsync(2100); complete('first'); await saving;
  expect(copy.current).toBe('newest'); await vi.advanceTimersByTimeAsync(0);
  expect(save.mock.calls[1]).toEqual(['newest', 'first']); expect(copy.state).toBe('saved'); await copy.dispose();
});
it('pauses a failed save and supports explicit retry without losing history', async () => {
  vi.useFakeTimers(); const save = vi.fn(async (value: string) => value).mockRejectedValueOnce(new Error('Offline'));
  const copy = new EditingLifecycle('a', save); copy.edit('b'); await copy.flush();
  expect(copy.state).toBe('error'); await vi.advanceTimersByTimeAsync(10000); expect(save).toHaveBeenCalledOnce();
  await copy.flush(); expect(copy.state).toBe('saved'); copy.undo(); expect(copy.current).toBe('a'); await copy.dispose();
});
it('retains history in conflict and explicitly resets it on baseline replacement', async () => {
  const copy = new EditingLifecycle('a', async value => value); copy.edit('b'); copy.conflict();
  await copy.flush(); copy.undo(); expect(copy.state).toBe('conflict'); expect(copy.canRedo).toBe(true);
  copy.reset('remote'); expect(copy.canUndo).toBe(false); expect(copy.canRedo).toBe(false); expect(copy.notice).toContain('history reset'); await copy.dispose();
});
it('does not erase a conflict when an admitted save subsequently fails', async () => {
  let fail!: (error: Error) => void;
  const copy = new EditingLifecycle('a', () => new Promise<string>((_, reject) => { fail = reject; }));
  copy.edit('b'); const saving = copy.flush(); copy.conflict('External change during save'); fail(new Error('Offline')); await saving;
  expect(copy.state).toBe('conflict'); expect(copy.failure).toBe('External change during save'); expect(copy.canUndo).toBe(true); await copy.dispose();
});
it('does not erase a conflict reported during an admitted save', async () => {
  let complete!: (value: string) => void;
  const copy = new EditingLifecycle('a', () => new Promise<string>(resolve => { complete = resolve; }));
  copy.edit('b'); const saving = copy.flush(); copy.conflict('External change during save'); complete('b'); await saving;
  expect(copy.state).toBe('conflict'); expect(copy.failure).toBe('External change during save'); expect(copy.canUndo).toBe(true); await copy.dispose();
});
it('retains an uncertain failed save after Undo to the old baseline, until confirmed by retry', async () => {
  let fail!: (error: Error) => void;
  const save = vi.fn(async (value: string) => value).mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; }));
  const copy = new EditingLifecycle('a', save); copy.edit('b'); const saving = copy.flush(); copy.undo(); fail(new Error('Response lost')); await saving;
  expect(copy.current).toBe('a'); expect(copy.dirty).toBe(true); expect(copy.state).toBe('error');
  await copy.flush(); expect(save.mock.calls[1]).toEqual(['a', 'a']); expect(copy.dirty).toBe(false); expect(copy.state).toBe('saved'); await copy.dispose();
});
it('does not apply a delayed invalid-candidate error to a newer corrected baseline', async () => {
  let fail!: (error: Error) => void;
  const copy = new EditingLifecycle('valid', () => new Promise<string>((_, reject) => { fail = reject; }));
  copy.edit('invalid'); const saving = copy.flush(); copy.edit('valid');
  fail(Object.assign(new Error('Old invalid candidate'), { status: 422 })); await saving;
  expect(copy.current).toBe('valid'); expect(copy.dirty).toBe(false); expect(copy.state).toBe('saved'); expect(copy.failure).toBeUndefined(); await copy.dispose();
});
it('suspension prevents queued writes while discard drains an admitted save', async () => {
  vi.useFakeTimers(); let complete!: (value: string) => void;
  const save = vi.fn(() => new Promise<string>(resolve => { complete = resolve; })), copy = new EditingLifecycle('a', save);
  copy.edit('b'); copy.suspend(); await vi.advanceTimersByTimeAsync(5000); expect(save).not.toHaveBeenCalled();
  copy.resume(); const saving = copy.flush(); const disposing = copy.dispose(); let done = false; void disposing.then(() => { done = true; });
  expect(done).toBe(false); complete('b'); await saving; await disposing; expect(copy.disposed).toBe(true); expect(copy.historySize.entries).toBe(0);
});
it('uses a native leave warning only for recoverable drafts and never initiates a save', async () => {
  const host = new EventTarget(), save = vi.fn(async (value: string) => value), copy = new EditingLifecycle('a', save);
  const detach = protectEditingDraft(() => copy.dirty || copy.state === 'conflict' || copy.state === 'error', host as Window);
  const clean = new Event('beforeunload', { cancelable: true }); host.dispatchEvent(clean); expect(clean.defaultPrevented).toBe(false);
  copy.edit('b'); const dirty = new Event('beforeunload', { cancelable: true }); host.dispatchEvent(dirty); expect(dirty.defaultPrevented).toBe(true); expect(save).not.toHaveBeenCalled();
  await copy.flush(); const saved = new Event('beforeunload', { cancelable: true }); host.dispatchEvent(saved); expect(saved.defaultPrevented).toBe(false);
  detach(); await copy.dispose();
});
