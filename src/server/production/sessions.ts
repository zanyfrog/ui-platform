import type { IncomingMessage } from 'node:http';
import type { Enrollment, IdentityDirectory } from './enrollment.js';
import { cookie, deny, digest, equal, noActor, origin, random } from './boundary.js';

export interface Session { enrollment: Enrollment; csrf: string; created: number; seen: number; epoch: number }
/** Server-owned ephemeral sessions: restarting invalidates all browser sessions. */
export class SecureSessions {
  readonly cookieName = '__Host-uib_session';
  private readonly sessions = new Map<string, Session>();
  private readonly epochs = new Map<string, number>();
  constructor(readonly applicationId: string, readonly audience: string, readonly publicOrigin: string, readonly directory: IdentityDirectory,
    private readonly now = Date.now, private readonly idleMs = 30 * 60_000, private readonly absoluteMs = 8 * 60 * 60_000) {
    origin(publicOrigin); if (!applicationId || !audience || idleMs <= 0 || absoluteMs < idleMs) deny();
  }
  private epochKey(e: Enrollment) { return JSON.stringify([e.userId, e.applicationId]); }
  private prune() { for (const [key, s] of this.sessions) if (this.now() - s.seen >= this.idleMs || this.now() - s.created >= this.absoluteMs) this.sessions.delete(key); }
  async issue(enrollment: Enrollment, oldToken?: string) {
    if (enrollment.applicationId !== this.applicationId || !await this.directory.current(enrollment)) deny();
    this.prune(); if (this.sessions.size >= 4096) deny();
    if (oldToken) this.sessions.delete(digest(oldToken));
    const token = random(), now = this.now();
    const session: Session = { enrollment: structuredClone(enrollment), csrf: random(), created: now, seen: now, epoch: this.epochs.get(this.epochKey(enrollment)) ?? 0 };
    this.sessions.set(digest(token), session);
    return { token, csrf: session.csrf, cookie: this.header(token), session };
  }
  header(token: string, clear = false) { return `${this.cookieName}=${clear ? '' : token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : Math.floor(this.absoluteMs / 1000)}`; }
  async read(request: IncomingMessage, mutation = false): Promise<Session> {
    noActor(request);
    const token = cookie(request, this.cookieName), key = token ? digest(token) : undefined, s = key ? this.sessions.get(key) : undefined;
    if (!s || s.enrollment.applicationId !== this.applicationId || this.now() - s.seen >= this.idleMs || this.now() - s.created >= this.absoluteMs ||
        s.epoch !== (this.epochs.get(this.epochKey(s.enrollment)) ?? 0) || !await this.directory.current(s.enrollment)) { if (key) this.sessions.delete(key); deny(); }
    if (mutation && (request.headers.origin !== this.publicOrigin || !equal(request.headers['x-uib-csrf'], s.csrf))) deny();
    s.seen = this.now(); return structuredClone(s);
  }
  async logout(request: IncomingMessage) { await this.read(request, true); this.sessions.delete(digest(cookie(request, this.cookieName)!)); return this.header('', true); }
  revoke(userId: string) { const key = JSON.stringify([userId, this.applicationId]); this.epochs.set(key, (this.epochs.get(key) ?? 0) + 1); }
  /** Only expose through an authenticated internal service adapter, never a public session-ID lookup. */
  async activeInternal(actor: { enrollment: Enrollment; sessionId: string; sessionEpoch?: number }) {
    const s = this.sessions.get(actor.sessionId);
    return !!s && (actor.sessionEpoch === undefined || actor.sessionEpoch === s.epoch) && JSON.stringify(s.enrollment) === JSON.stringify(actor.enrollment) && s.epoch === (this.epochs.get(this.epochKey(s.enrollment)) ?? 0) &&
      this.now() - s.seen < this.idleMs && this.now() - s.created < this.absoluteMs && await this.directory.current(s.enrollment);
  }
  close() { this.sessions.clear(); this.epochs.clear(); }
}
