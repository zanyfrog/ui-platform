import path from 'node:path';
import { readFile,realpath } from 'node:fs/promises';
import { readRoleBundle } from '@ui-platform/artifacts/storage';
import { verifyComponentPackages, componentPackageDirectory } from '@ui-platform/visual-artifacts/component-packages';
import { inspectPublishedComposition, type ReleaseAdmission, type ReleaseSelection } from './releases.js';
import { deny, digest } from './boundary.js';

/** Read the accepted publication owner's manifest; never activate, recover, publish or read live Component definitions. */
export class ApplicationPublicationSelection implements ReleaseSelection {
  private readonly admitted = new Map<string, ReleaseAdmission>();
  constructor(private readonly applicationRoot: string, private readonly applicationId: string, private readonly schemaIdentity: string) { if (!path.isAbsolute(applicationRoot)) deny(); }
  async read(): Promise<ReleaseAdmission> {
    if(await realpath(this.applicationRoot)!==path.resolve(this.applicationRoot))deny();
    const app = JSON.parse(await readFile(path.join(this.applicationRoot, 'app.manifest.json'), 'utf8')); if (app.appId !== this.applicationId) deny();
    const settings=JSON.parse(await readFile(path.join(this.applicationRoot,'app.settings.json'),'utf8'));if(settings.application?.status!=='active')deny();
    const root = path.join(this.applicationRoot, 'presentation');
    const snapshot = await readRoleBundle({ root, directory: root, anchor: 'presentation.manifest.json', paths: ['presentation.manifest.json', 'draft/presentation.json'] }, { recovery: 'refuse' });
    const manifest = JSON.parse(snapshot.files['presentation.manifest.json'] ?? 'null');
    if (!manifest || manifest.type !== 'ui-platform.presentation' || manifest.schemaVersion !== '1.0.0' || manifest.applicationId !== this.applicationId || !Number.isSafeInteger(manifest.activeVersion) || manifest.activeVersion < 1) deny();
    const records = manifest.versions.filter((v: any) => v.version === manifest.activeVersion), record = records[0];
    if (records.length !== 1 || !record.componentPackageIntegrity) deny();
    const versionRoot = path.join(root, 'versions', `v${manifest.activeVersion}`), presentation = JSON.parse(await readFile(path.join(versionRoot, 'presentation.json'), 'utf8'));
    if (digest(JSON.stringify(presentation)) !== record.checksum) deny();
    const releaseId = 'release_' + digest(JSON.stringify({ applicationId: this.applicationId, version: record.version, checksum: record.checksum, packages: record.componentPackageIntegrity }));
    let admission = this.admitted.get(releaseId);
    if (!admission) {
      const composition = path.join(versionRoot, 'composition'); await verifyComponentPackages(path.join(composition, componentPackageDirectory), record.componentPackageIntegrity);
      admission = await inspectPublishedComposition(composition, this.applicationId, releaseId, this.schemaIdentity); this.admitted.set(releaseId, admission);
    }
    return structuredClone(admission);
  }
}
