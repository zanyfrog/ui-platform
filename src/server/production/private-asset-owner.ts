import { DatabaseSync } from 'node:sqlite';
import { lstat, mkdir, open, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { deny, digest, identifier } from './boundary.js';
import type { PrivateAssetVersion } from './private-assets.js';

/** Private extension of the existing file/hash/version transport. Public Application asset ownership stays unchanged. */
export class PrivateAssetOwner {
  private constructor(readonly root: string, private readonly db: DatabaseSync) {}
  static async open(root: string, excludedPublicRoots: string[]) {
    if (!path.isAbsolute(root) || !excludedPublicRoots.length) deny();
    for (const p of excludedPublicRoots) {
      if (!path.isAbsolute(p) || await realpath(p) !== path.resolve(p)) deny();
      const publicRoot = path.resolve(p), privateRoot = path.resolve(root);
      if (privateRoot === publicRoot || privateRoot.startsWith(publicRoot + path.sep) || publicRoot.startsWith(privateRoot + path.sep)) deny();
    }
    await mkdir(root, { recursive: true });
    if (await realpath(root) !== path.resolve(root)) deny();
    for (let current = root; ; current = path.dirname(current)) { if ((await lstat(current)).isSymbolicLink()) deny(); if (current === path.dirname(current)) break; }
    await mkdir(path.join(root, 'blobs'), { recursive: true }); if ((await lstat(path.join(root, 'blobs'))).isSymbolicLink()) deny();
    const db = new DatabaseSync(path.join(root, 'versions.sqlite'));
    db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS private_versions(app TEXT NOT NULL,id TEXT NOT NULL,version TEXT NOT NULL,sha TEXT NOT NULL,name TEXT NOT NULL,media_type TEXT NOT NULL,PRIMARY KEY(app,id,version));
      CREATE TABLE IF NOT EXISTS private_heads(app TEXT NOT NULL,id TEXT NOT NULL,sha TEXT NOT NULL,PRIMARY KEY(app,id));`);
    return new PrivateAssetOwner(path.resolve(root), db);
  }
  async save(applicationId: string, id: string, name: string, bytes: Buffer, expectedHash: string | null, assertAuthority: () => Promise<void>) {
    if (!identifier(applicationId) || !identifier(id) || !name || name.length > 255 || !bytes.length || bytes.length > 5_000_000) deny();
    await assertAuthority();
    const mediaType = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : bytes[0] === 255 && bytes[1] === 216 ? 'image/jpeg' : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP' ? 'image/webp' : undefined;
    if (!mediaType) deny(); const sha = digest(bytes), version = 'v_' + sha;
    const head = this.db.prepare('SELECT sha FROM private_heads WHERE app=? AND id=?').get(applicationId,id);
    if ((head?.sha ?? null) !== expectedHash) throw new Error('ASSET_VERSION_CONFLICT');
    const file = path.join(this.root, 'blobs', sha);
    try { const handle = await open(file, 'wx', 0o600); try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); } }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; const stat = await lstat(file); if (stat.isSymbolicLink() || stat.nlink !== 1 || digest(await readFile(file)) !== sha) deny(); }
    await assertAuthority(); this.db.exec('BEGIN IMMEDIATE');
    try {
      const current = this.db.prepare('SELECT sha FROM private_heads WHERE app=? AND id=?').get(applicationId,id); if ((current?.sha ?? null) !== expectedHash) throw new Error('ASSET_VERSION_CONFLICT');
      this.db.prepare('INSERT OR IGNORE INTO private_versions VALUES(?,?,?,?,?,?)').run(applicationId,id,version,sha,name,mediaType);
      this.db.prepare('INSERT INTO private_heads VALUES(?,?,?) ON CONFLICT(app,id) DO UPDATE SET sha=excluded.sha').run(applicationId,id,sha); this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return { id, version, sha256: sha };
  }
  async lookup(applicationId: string, id: string, version: string): Promise<PrivateAssetVersion | undefined> {
    const row = this.db.prepare('SELECT * FROM private_versions WHERE app=? AND id=? AND version=?').get(applicationId,id,version); if (!row) return undefined;
    const sha = String(row.sha), mediaType = String(row.media_type) as 'image/png' | 'image/jpeg' | 'image/webp';
    return { applicationId, id, version, name: String(row.name), mediaType, bytes: { file: 'blobs/' + sha, sha256: sha }, thumbnail: { file: 'blobs/' + sha, sha256: sha, mediaType } };
  }
  close() { this.db.close(); }
}
