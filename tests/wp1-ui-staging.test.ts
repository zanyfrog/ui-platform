import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { SecurityDefinitionService, SecurityDefinitionStore, parseSecurityDocument, reconcileSecurityDirectory, runSecurityCli, securityChecksum } from '@ui-platform/i-am/definitions';
import { ArtifactEditorWorkspace } from '../src/server/artifact-editor.js';

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
it('stages a real editor save through the shared I-AM service without activation', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'iam-ui-stage-')); roots.push(root);
  const bundle = path.join(root, 'security', 'roles', 'reader'); await mkdir(bundle, { recursive: true });
  await writeFile(path.join(bundle, 'artifact.json'), JSON.stringify({ schemaVersion: 1, artifactId: 'role-a', artifactType: 'security.role', name: 'Reader', definitionVersion: 1, files: { definition: 'definition.json' } }));
  const definition = { format: 'ui-platform.security', formatVersion: 1, definition: { kind: 'role', id: 'role-a', key: 'reader', name: 'Reader', status: 'active', owner: { kind: 'application', applicationId: 'app-a' }, permissionSets: [] } };
  await writeFile(path.join(bundle, 'definition.json'), JSON.stringify(definition));
  const dbPath = path.join(root, 'iam.sqlite'), store = new SecurityDefinitionStore(dbPath);
  try {
    const service = new SecurityDefinitionService(store);
    const workspace = new ArtifactEditorWorkspace(root, 'app-a', () => {}, undefined, error => { throw error; }, {
      stage: (text, actorId) => {
        const parsed = parseSecurityDocument(text);
        const previous = parsed.document && service.active().find(item => item.definition.id === parsed.document!.definition.id);
        return service.stageText({ text, expectedChecksum: previous && securityChecksum(previous), source: 'ui', actorId, idempotencyKey: randomUUID(), expectedRevision: service.revision() });
      },
    });
    const summary = (await workspace.discover())[0];
    const loaded = await workspace.load(summary.locator);
    const saved = await workspace.save(summary.locator, { expectedChecksum: loaded.checksum, files: { 'definition.json': JSON.stringify({ ...definition, definition: { ...definition.definition, name: 'Renamed Reader' } }) } }, 'fixture-admin');
    expect(saved.securityCandidate?.activatable).toBe(true);
    expect(saved.securityCandidate?.diagnostics).toEqual([]);
    expect(service.candidateRequest(saved.securityCandidate!.id)?.source).toBe('ui');
    const output: string[] = [];
    expect(runSecurityCli(['stage', path.join(bundle, 'definition.json'), '--db', dbPath], { out: text => output.push(text), err: error => { throw new Error(error); } })).toBe(0);
    const cli = JSON.parse(output[0]) as { id: string; diagnostics: unknown[] };
    const textCandidates: Array<{ id: string; diagnostics: unknown[] }> = [];
    const watcher = reconcileSecurityDirectory(path.join(root, 'security'), service, event => { if (event.candidate) textCandidates.push(event.candidate); });
    watcher.close();
    const api = service.stageText({ text: JSON.stringify({ ...definition, definition: { ...definition.definition, name: 'Renamed Reader' } }), expectedRevision: 0, source: 'api', actorId: 'fixture-admin', idempotencyKey: randomUUID() });
    const candidates = [saved.securityCandidate!, cli, textCandidates[0], api];
    expect(candidates.every(candidate => candidate.diagnostics.length === 0)).toBe(true);
    const documents = candidates.map(candidate => service.candidateRequest(candidate.id)!.changes[0].document);
    expect(documents.every(document => JSON.stringify(document) === JSON.stringify(documents[0]))).toBe(true);
    expect(new Set(documents.map(securityChecksum)).size).toBe(1);
    expect(service.revision()).toBe(0);
    expect(service.active()).toEqual([]);
  } finally { store.close(); }
});
