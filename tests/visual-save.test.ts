import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateArtifact, type ArtifactBundle } from '@ui-platform/visual-artifacts';
import { VisualArtifactService, toRuntime } from '../src/server/visual-artifacts.js';
import { validateVisualRoleSyntax } from '../src/server/visual-candidate.js';

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'visual-save-')); roots.push(root);
  const service = new VisualArtifactService(root, 'page'), before = await service.create('example');
  const candidate = { ...before.files, source: '<section data-uip-node="new">New</section>', css: ':host{color:blue}', metadata: JSON.stringify({ ...before.metadata!, displayName: 'New', state: { text: 'New' }, bindings: [{ node: 'new', target: 'text', value: 'local.text' }] }), fixtures: '{"route":{}}', code: 'export const revision = "new";' };
  const validate = async (bundle: ArtifactBundle) => { await validateVisualRoleSyntax(bundle.files); const errors = validateArtifact(toRuntime(bundle)!).filter(item => item.severity === 'error'); if (errors.length) throw Object.assign(new Error(errors.map(item => item.message).join(' ')), { status: 422 }); };
  return { root, service, before, candidate, validate };
}
it('validates the intended complete Visual candidate and preserves the separate repair path', async () => {
  const f = await fixture();
  await expect(f.service.saveCandidate(f.before.locator, { ...f.candidate, source: '<p data-uip-node="wrong">Wrong</p>' }, f.before.hash, { validate: f.validate, admit: async () => {} })).rejects.toMatchObject({ status: 422 });
  expect((await f.service.read(f.before.locator)).files).toEqual(f.before.files);
  const saved = await f.service.saveCandidate(f.before.locator, f.candidate, f.before.hash, { validate: f.validate, admit: async () => {} });
  expect(saved.files).toEqual(f.candidate); expect((await f.service.read(f.before.locator)).hash).toBe(saved.hash);
  const repaired = await f.service.save(f.before.locator, 'metadata', '{invalid', saved.hash);
  expect(repaired.metadata).toBeUndefined(); expect(repaired.diagnostics.some(item => item.severity === 'error')).toBe(true);
});
it.each(['page.html', 'page.css', 'page.visual.json', 'page.fixtures.json', 'page.functions.ts'])('restores all source roles when the real service fails writing %s', async role => {
  const f = await fixture(), failing = new VisualArtifactService(f.root, 'page', { beforeWrite(file) { if (file === role) throw new Error('Injected service write failure'); } });
  await expect(failing.saveCandidate(f.before.locator, f.candidate, f.before.hash, { validate: f.validate, admit: async () => {} })).rejects.toThrow('Injected service write failure');
  expect((await f.service.read(f.before.locator)).files).toEqual(f.before.files);
});
it('returns recovery-required for rollback failure, then recovers before the next service read', async () => {
  const f = await fixture(), failing = new VisualArtifactService(f.root, 'page', { beforeWrite(file) { if (file === 'page.visual.json') throw new Error('Commit failed'); }, beforeRollbackWrite() { throw new Error('Rollback failed'); } });
  await expect(failing.saveCandidate(f.before.locator, f.candidate, f.before.hash, { validate: f.validate, admit: async () => {} })).rejects.toMatchObject({ code: 'source.recovery-required' });
  expect((await f.service.read(f.before.locator)).files).toEqual(f.before.files);
});
it('rechecks original authority and external source after complete validation, before persistence', async () => {
  const f = await fixture();
  await expect(f.service.saveCandidate(f.before.locator, f.candidate, f.before.hash, { validate: f.validate, admit: async () => { throw Object.assign(new Error('Original session revoked'), { status: 403 }); } })).rejects.toMatchObject({ status: 403 });
  expect((await f.service.read(f.before.locator)).files).toEqual(f.before.files);
  const file = path.join(f.root, 'example/page.css');
  await expect(f.service.saveCandidate(f.before.locator, f.candidate, f.before.hash, { validate: f.validate, admit: async () => { await writeFile(file, ':host{color:red}'); } })).rejects.toThrow('changed');
  expect(await readFile(file, 'utf8')).toBe(':host{color:red}');
  expect((await f.service.read(f.before.locator)).files.source).toBe(f.before.files.source);
});
it('rejects stale editors and unsupported function/CSS candidates without writing roles', async () => {
  const f = await fixture();
  for (const files of [{ ...f.candidate, css: 'a {' }, { ...f.candidate, code: 'export function load(name) { return import(name); }' }]) await expect(f.service.saveCandidate(f.before.locator, files, f.before.hash, { validate: f.validate, admit: async () => {} })).rejects.toThrow();
  expect((await f.service.read(f.before.locator)).files).toEqual(f.before.files);
  await f.service.saveCandidate(f.before.locator, f.candidate, f.before.hash, { validate: f.validate, admit: async () => {} });
  await expect(f.service.saveCandidate(f.before.locator, f.before.files, f.before.hash, { validate: f.validate, admit: async () => {} })).rejects.toMatchObject({ status: 409 });
});
