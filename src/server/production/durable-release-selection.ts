import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { LocalDirectoryDeploymentTarget } from '@ui-platform/artifacts';
import { ApplicationPublicationSelection } from './publication-integration.js';
import { inspectPublishedComposition } from './releases.js';
import { deny, digest } from './boundary.js';
import type { PublicRelease } from './runtime.js';

/** Shared reader for the deployment artifact selected by the single durable pointer. */
export class DurableReleaseSelection {
  constructor(private readonly target: Pick<LocalDirectoryDeploymentTarget, 'readVerifiedActive'>,
    private readonly applicationRoot: string, private readonly applicationId: string,
    private readonly schemaIdentity: string) {}

  private async readArtifact() {
    const { binding, manifest } = await this.target.readVerifiedActive(this.applicationId);
    const read = async (file: string) => {
      if (!Object.hasOwn(manifest.files, file) || !file.split('/').every(part => /^[a-z0-9_.-]+$/i.test(part) && part !== '.' && part !== '..')) deny();
      const bytes = await readFile(path.join(binding.release, file));
      if (digest(bytes) !== manifest.files[file]?.replace(/^sha256:/, '')) deny();
      return bytes;
    };
    const descriptor = JSON.parse((await read('release-selection.json')).toString('utf8'));
    if (!Number.isSafeInteger(descriptor.version) || descriptor.version < 1 ||
        descriptor.schemaIdentity !== this.schemaIdentity || !Array.isArray(descriptor.publicFiles)) deny();
    if (typeof descriptor.releaseId !== 'string' || !/^release_[a-f0-9]{64}$/.test(descriptor.releaseId)) deny();
    const publicFiles = new Map<string, { bytes: Uint8Array; sha256: string; mediaType: string }>();
    for (const { route, file, mediaType } of descriptor.publicFiles) {
      if (typeof route !== 'string' || !route.startsWith('/') || publicFiles.has(route) ||
          typeof file !== 'string' || !file.startsWith('public/') || typeof mediaType !== 'string' ||
          !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(mediaType)) deny();
      const bytes = await read(file);
      publicFiles.set(route, { bytes, sha256: digest(bytes), mediaType });
    }
    if (!publicFiles.has('/') || !publicFiles.has('/application.js')) deny();
    const publicRelease: PublicRelease = { releaseId: descriptor.releaseId, manifestFingerprint: binding.manifestFingerprint, publicFiles };
    const assertCurrent = async () => {
      if ((await this.target.readVerifiedActive(this.applicationId)).binding.manifestFingerprint !== binding.manifestFingerprint) deny();
    };
    return { binding, descriptor, publicRelease, assertCurrent };
  }

  /** Runtime has read-only access to deployment artifacts and no publication lock authority. */
  async readPublic() {
    const { binding, publicRelease, assertCurrent } = await this.readArtifact();
    await assertCurrent();
    return { binding, publicRelease };
  }

  async observe() {
    const { binding, descriptor, publicRelease, assertCurrent } = await this.readArtifact();
    const selection = new ApplicationPublicationSelection(this.applicationRoot, this.applicationId, this.schemaIdentity);
    const composition = await selection.readPublishedVersion(descriptor.version);
    const observed = await inspectPublishedComposition(composition.compositionRoot, this.applicationId, composition.releaseId, this.schemaIdentity);
    if (observed.releaseId !== descriptor.releaseId || digest(JSON.stringify(observed.files)) !== descriptor.compositionDigest) deny();
    await assertCurrent();
    return { binding, composition: observed, publicRelease };
  }

  async read() { return (await this.observe()).composition; }
}
