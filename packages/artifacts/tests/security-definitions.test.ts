import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ArtifactDefinitionRegistry, FileSystemArtifactService } from '../src/index.js';

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
const sample = { format: 'ui-platform.security', formatVersion: 1, definition: { kind: 'role', id: 'role-a', key: 'role-a', name: 'Reader', status: 'active', owner: { kind: 'application', applicationId: 'app-a' }, permissionSets: [] } };

async function source(manifest: object, document: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'security-artifact-')); roots.push(root);
  const dir = path.join(root, 'security', 'roles', 'reader'); await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'artifact.json'), JSON.stringify(manifest));
  await writeFile(path.join(dir, 'definition.json'), document);
  return { dir, service: new FileSystemArtifactService({ root }) };
}

it('registers every security artifact kind and validates a real text bundle', async () => {
  const registry = new ArtifactDefinitionRegistry();
  for (const kind of ['user', 'service', 'person-link', 'permission', 'permission-set', 'role', 'group', 'service-requirement', 'application-security', 'grant-boundary', 'service-use-approval', 'role-assignment', 'group-membership', 'service-assignment']) expect(registry.has(`security.${kind}`)).toBe(true);
  const { dir, service } = await source({ schemaVersion: 1, artifactId: 'role-a', artifactType: 'security.role', name: 'Reader', definitionVersion: 1, files: { definition: 'definition.json' } }, JSON.stringify(sample));
  expect((await service.validate(dir)).valid).toBe(true);
  const edited = await service.save(dir, { files: { 'definition.json': JSON.stringify({ ...sample, definition: { ...sample.definition, name: 'Renamed' } }) } });
  expect(edited.saved).toBe(true);
  expect(edited.validation.valid).toBe(true);
  expect(edited.artifact.manifest?.artifactId).toBe('role-a');
});

it('rejects ID/kind mismatch, duplicate keys and escaping file paths', async () => {
  const manifest = { schemaVersion: 1, artifactId: 'wrong-id', artifactType: 'security.role', name: 'Reader', definitionVersion: 1, files: { definition: 'definition.json' } };
  const { dir, service } = await source(manifest, JSON.stringify(sample));
  expect((await service.validate(dir)).diagnostics.map(d => d.code)).toContain('security.id-mismatch');
  const changed = await service.save(dir, { files: { 'definition.json': '{"format":"ui-platform.security","format":"ui-platform.security"}' } });
  expect(changed.saved).toBe(true);
  expect(changed.validation.diagnostics.map(d => d.code)).toContain('security.JSON_INVALID');
  const unsafe = await source({ ...manifest, artifactId: 'role-a', files: { definition: '../outside.json' } }, JSON.stringify(sample));
  expect((await unsafe.service.validate(unsafe.dir)).diagnostics.map(d => d.code)).toContain('manifest.structure');
});
