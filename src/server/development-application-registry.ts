import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { AdministrationConfiguration } from '@ui-platform/i-am/administration';
import { V1_AUTHORITY_ID } from './v1-development-policy.js';

type Registration = { applicationId: string; key: string; createdBy: string };
const permanentId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const keyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Host-owned creation ledger. A copied or edited manifest cannot register an owner.
 * Registration follows successful normal creation and grants no security authority. */
export class DevelopmentApplicationRegistry {
  private readonly db: DatabaseSync;
  constructor(file: string, private readonly applicationsRoot: string) {
    mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS development_applications (application_id TEXT PRIMARY KEY, application_key TEXT NOT NULL UNIQUE, created_by TEXT NOT NULL)');
  }
  close() { this.db.close(); }
  revision(): string {
    const rows = this.db.prepare('SELECT application_id, application_key FROM development_applications ORDER BY application_id').all() as Array<{ application_id: string; application_key: string }>;
    return createHash('sha256').update(JSON.stringify(rows.map(r => [r, this.provisioning.resolve(r.application_id) ?? null]))).digest('hex');
  }
  private manifest(key: string, applicationId: string): string {
    if (!keyPattern.test(key) || !permanentId.test(applicationId)) throw new Error('DEVELOPMENT_APPLICATION_INVALID');
    const root = realpathSync(this.applicationsRoot);
    const directory = realpathSync(path.join(root, key));
    if (directory.toLowerCase() !== path.join(root, key).toLowerCase()) throw new Error('DEVELOPMENT_APPLICATION_OWNER_INVALID');
    const manifest = realpathSync(path.join(directory, 'app.manifest.json'));
    if (path.dirname(manifest).toLowerCase() !== directory.toLowerCase()) throw new Error('DEVELOPMENT_APPLICATION_OWNER_INVALID');
    const bytes = readFileSync(manifest, 'utf8');
    if (JSON.parse(bytes).appId !== applicationId) throw new Error('DEVELOPMENT_APPLICATION_OWNER_INVALID');
    const settings = JSON.parse(readFileSync(path.join(directory, 'app.settings.json'), 'utf8'));
    if (settings.application?.status !== 'active') throw new Error('DEVELOPMENT_APPLICATION_DISABLED');
    return bytes;
  }
  /** Trusted creation completion only; never accepts HTTP-supplied IDs or a creator grant. */
  registerCreated(application: { key: string; appId: string; valid: boolean; status: string }, createdBy: string): void {
    if (!application.valid || application.status !== 'active' || !createdBy) throw new Error('DEVELOPMENT_APPLICATION_INVALID');
    this.manifest(application.key, application.appId);
    this.db.prepare('INSERT INTO development_applications(application_id, application_key, created_by) VALUES(?,?,?)').run(application.appId, application.key, createdBy);
  }
  byKey(key: string): Registration | undefined {
    const row = this.db.prepare('SELECT application_id, application_key, created_by FROM development_applications WHERE application_key=?').get(key) as { application_id: string; application_key: string; created_by: string } | undefined;
    if (!row) return undefined;
    try { this.manifest(key, row.application_id); } catch { return undefined; }
    return { applicationId: row.application_id, key: row.application_key, createdBy: row.created_by };
  }
  readonly provisioning: NonNullable<AdministrationConfiguration['applicationProvisioning']> = {
    resolve: applicationId => {
      const row = this.db.prepare('SELECT application_key FROM development_applications WHERE application_id=?').get(applicationId) as { application_key: string } | undefined;
      if (!row) return undefined;
      try {
        const bytes = this.manifest(row.application_key, applicationId);
        return { resource: { authorityId: V1_AUTHORITY_ID, applicationId, kind: 'application', id: applicationId },
          owner: { kind: 'application', applicationId }, status: 'active', revision: createHash('sha256').update(bytes).digest('hex') };
      } catch { return undefined; }
    },
  };
}
