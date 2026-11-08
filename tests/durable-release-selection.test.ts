import path from 'node:path';
import { tmpdir } from 'node:os';
import { mkdir, mkdtemp, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { LocalDirectoryDeploymentTarget } from '../packages/artifacts/src/application/local-target.js';
import { filesUnder } from '../packages/artifacts/src/application/common.js';
import type { RuntimeManifest } from '../packages/artifacts/src/application/build.js';
import { digest } from '../src/server/production/boundary.js';
import { DurableReleaseSelection } from '../src/server/production/durable-release-selection.js';

describe('durable release reader', () => {
  it.each(['valid', 'pointer changed', 'bundle changed', 'composition changed', 'wrong release', 'invalid route file', 'wrong build', 'wrong manifest fingerprint', 'linked public directory', 'directory in place of bundle'])(
    'checks selected artifact and publication when %s', async scenario => {
      const root = await mkdtemp(path.join(tmpdir(), 'uip-durable-'));
      try {
        const app = path.join(root, 'app'), candidate = path.join(root, 'candidate');
        const composition = 'presentation/versions/v1/composition';
        const put = async (base: string, name: string, value: string) => {
          const file = path.join(base, name);
          await mkdir(path.dirname(file), { recursive: true });
          await writeFile(file, value);
        };
        const json = (base: string, name: string, value: unknown) => put(base, name, JSON.stringify(value));
        const presentation = {}, packages = { schemaVersion: 1, files: {}, versions: {} };
        const checksum = digest(JSON.stringify(presentation)), componentPackageIntegrity = digest(JSON.stringify(packages));
        const releaseId = 'release_' + digest(JSON.stringify({ applicationId: 'app', version: 1, checksum, packages: componentPackageIntegrity }));
        await json(app, 'app.manifest.json', { appId: 'app' });
        await json(app, 'app.settings.json', { application: { status: 'active' } });
        await json(app, 'presentation/draft/presentation.json', presentation);
        await json(app, 'presentation/versions/v1/presentation.json', presentation);
        await json(app, 'presentation/presentation.manifest.json', { type: 'ui-platform.presentation', schemaVersion: '1.0.0', applicationId: 'app', activeVersion: 1,
          versions: [{ version: 1, checksum, componentPackageIntegrity }] });
        await json(app, composition + '/presentation/component-packages/integrity.json', packages);
        await put(app, composition + '/contract.json', '{}');
        await put(candidate, 'public/index.html', '<html></html>');
        await put(candidate, 'public/application.js', 'export const release = 1;');
        await json(candidate, 'release-selection.json', {
          version: 1, schemaIdentity: 'schema', releaseId: scenario === 'wrong release' ? 'wrong' : releaseId,
          compositionDigest: digest(JSON.stringify(await filesUnder(path.join(app, composition)))),
          publicFiles: [
            { route: '/', file: 'public/index.html', mediaType: 'text/html' },
            { route: '/application.js', file: scenario === 'invalid route file' ? 'public/../release-selection.json' : 'public/application.js', mediaType: 'text/javascript' },
          ],
        });
        const manifest: RuntimeManifest = {
          manifestVersion: 1, applicationId: 'app', buildId: 'app-v1', builtAt: new Date().toISOString(),
          sourceFingerprint: 'test', uiPlatformVersion: 'test', runtimeCompatibility: { node: process.versions.node, target: process.platform },
          entryPoint: 'public/application.js', requiredEnvironmentKeys: [], migrationIdsIncluded: [], migrationChecksums: {},
          files: await filesUnder(candidate), artifacts: [], validationReport: 'release-selection.json',
        };
        await json(candidate, 'runtime-manifest.json', manifest);
        const targetRoot = path.join(root, 'deployment');
        const target = new LocalDirectoryDeploymentTarget({ root: targetRoot, activate: async () => {}, health: async () => {}, oldRuntimeCompatible: async () => true });
        await target.stage(candidate, manifest);
        await target.promote(manifest);
        const initial = await target.readVerifiedActive('app');
        if (scenario === 'linked public directory') {
          const publicDirectory = path.join(initial.binding.release, 'public');
          const linked = path.join(root, 'linked-public');
          await rename(publicDirectory, linked);
          await symlink(linked, publicDirectory, process.platform === 'win32' ? 'junction' : 'dir');
        }
        if (scenario === 'directory in place of bundle') {
          const bundle = path.join(initial.binding.release, 'public/application.js');
          await rm(bundle);
          await mkdir(bundle);
        }
        if (scenario === 'wrong build') await json(targetRoot, 'active-release.json', { ...initial.binding, buildId: 'another-build' });
        if (scenario === 'wrong manifest fingerprint') await json(targetRoot, 'active-release.json', { ...initial.binding, manifestFingerprint: 'sha256:' + '0'.repeat(64) });
        if (scenario === 'bundle changed') await put(initial.binding.release, 'public/application.js', 'changed');
        if (scenario === 'composition changed') await put(app, composition + '/contract.json', '{"changed":true}');
        if (scenario === 'pointer changed') {
          const read = target.readVerifiedActive.bind(target);
          vi.spyOn(target, 'readVerifiedActive').mockImplementationOnce(async applicationId => {
            const result = await read(applicationId);
            await rm(path.join(targetRoot, 'active-release.json'));
            return result;
          });
        }
        const reader = new DurableReleaseSelection(target, app, 'app', 'schema');
        if (scenario !== 'valid') await expect(reader.observe()).rejects.toThrow();
        else {
          const observed = await reader.observe();
          expect(observed.binding).toEqual(initial.binding);
          expect(observed.composition.releaseId).toBe(releaseId);
          expect(observed.publicRelease.publicFiles.get('/application.js')?.sha256).toBe(digest('export const release = 1;'));
          const runtimeReader = new DurableReleaseSelection(target, path.join(root, 'unavailable-publication'), 'app', 'schema');
          const runtime = await runtimeReader.readPublic();
          expect(runtime.binding).toEqual(initial.binding);
          expect(runtime.publicRelease).toEqual(observed.publicRelease);
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
});
