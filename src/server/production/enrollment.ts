import { DatabaseSync } from 'node:sqlite';
import { isAbsolute } from 'node:path';
import { deny, identifier } from './boundary.js';

export interface Enrollment { issuer: string; subject: string; userId: string; applicationId: string; revision: number }
export interface IdentityDirectory {
  resolve(issuer: string, subject: string, applicationId: string): Promise<Enrollment>;
  current(enrollment: Enrollment): Promise<boolean>;
}
/** Data-service-owned permanent identity links. It stores no role or data permission. */
export class PermanentIdentityDirectory implements IdentityDirectory {
  private readonly db: DatabaseSync;
  constructor(file: string, private readonly activeUser: (userId: string) => Promise<boolean>, private readonly operator: (context: unknown) => Promise<string>) {
    if (!isAbsolute(file)) deny();
    this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS identity_links (issuer TEXT NOT NULL, subject TEXT NOT NULL, user_id TEXT NOT NULL, PRIMARY KEY(issuer,subject));
      CREATE TABLE IF NOT EXISTS identity_enrollment (issuer TEXT NOT NULL, subject TEXT NOT NULL, application_id TEXT NOT NULL, revision INTEGER NOT NULL, active INTEGER NOT NULL, PRIMARY KEY(issuer,subject,application_id));
      CREATE TABLE IF NOT EXISTS identity_audit (operator_id TEXT NOT NULL, operation TEXT NOT NULL, issuer TEXT NOT NULL, subject TEXT NOT NULL, application_id TEXT NOT NULL, occurred_at TEXT NOT NULL);`);
  }
  async approve(context: unknown, issuer: string, subject: string, userId: string, applicationId: string) {
    const actor = await this.operator(context);
    const url = new URL(issuer);
    if (!actor || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !subject || subject.length > 255 || !identifier(userId) || !identifier(applicationId) || !await this.activeUser(userId)) deny();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous = this.db.prepare('SELECT user_id FROM identity_links WHERE issuer=? AND subject=?').get(issuer, subject);
      // A permanent link cannot be reassigned, including after revocation.
      if (previous && previous.user_id !== userId) deny();
      this.db.prepare('INSERT OR IGNORE INTO identity_links VALUES (?,?,?)').run(issuer, subject, userId);
      this.db.prepare('INSERT INTO identity_enrollment VALUES (?,?,?,1,1) ON CONFLICT(issuer,subject,application_id) DO UPDATE SET active=1,revision=revision+1').run(issuer, subject, applicationId);
      this.audit(actor, 'approve', issuer, subject, applicationId); this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  async revoke(context: unknown, issuer: string, subject: string, applicationId: string) {
    const actor = await this.operator(context); if (!actor) deny();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('UPDATE identity_enrollment SET active=0,revision=revision+1 WHERE issuer=? AND subject=? AND application_id=?').run(issuer, subject, applicationId);
      this.audit(actor, 'revoke', issuer, subject, applicationId); this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  private audit(actor: string, operation: string, issuer: string, subject: string, applicationId: string) {
    this.db.prepare('INSERT INTO identity_audit VALUES (?,?,?,?,?,?)').run(actor, operation, issuer, subject, applicationId, new Date().toISOString());
  }
  async resolve(issuer: string, subject: string, applicationId: string): Promise<Enrollment> {
    const row = this.db.prepare('SELECT l.user_id,e.revision FROM identity_links l JOIN identity_enrollment e USING(issuer,subject) WHERE issuer=? AND subject=? AND application_id=? AND active=1').get(issuer, subject, applicationId);
    if (!row || !await this.activeUser(String(row.user_id))) deny();
    return { issuer, subject, applicationId, userId: String(row!.user_id), revision: Number(row!.revision) };
  }
  async current(value: Enrollment) {
    try { const current = await this.resolve(value.issuer, value.subject, value.applicationId); return current.userId === value.userId && current.revision === value.revision; } catch { return false; }
  }
  close() { this.db.close(); }
}
