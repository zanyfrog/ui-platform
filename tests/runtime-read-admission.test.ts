import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { storageKey } from '../packages/artifacts/src/storage.js';
import { withRuntimeGraphRead } from '../packages/visual-artifacts/src/runtime-read-admission.js';
const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
async function writerLock(content: string) {
  const root = await mkdtemp(path.join(tmpdir(), 'runtime-admission-')); roots.push(root);
  const directory = path.join(root, '.uib', 'locks'); await mkdir(directory, { recursive: true });
  const file = path.join(directory, `${storageKey('visual-runtime-graph-v1')}.lock`); await writeFile(file, content);
  return { root, file };
}
it('runtime initial capture waits for a live writer without stealing its lock or returning partial source', async () => {
  const { root, file } = await writerLock(String(process.pid)); let captures = 0;
  const result = withRuntimeGraphRead(root, async () => { captures++; return 'complete revision'; });
  await new Promise(resolve => setTimeout(resolve, 50));
  expect(captures).toBe(0); expect(await readFile(file, 'utf8')).toBe(String(process.pid));
  await rm(file); expect(await result).toBe('complete revision'); expect(captures).toBe(1);
});
it('incomplete writer locks remain a recovery failure and never run the runtime capture', async () => {
  const { root, file } = await writerLock(''); let captured = false;
  await expect(withRuntimeGraphRead(root, async () => { captured = true; })).rejects.toThrow('Artifact lock is incomplete; operator recovery is required.');
  expect(captured).toBe(false); expect(await readFile(file, 'utf8')).toBe('');
});
