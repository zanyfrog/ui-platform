/** Local fixture lifecycle only. No capture provider, authority or editor capability. */
export interface PreviewIdentity {
  subjectId: string; sessionId: string; applicationId: string; artifactKey: string;
}
export type PreviewState = 'empty' | 'capturing' | 'ready' | 'stale' | 'unavailable' | 'revoked' | 'disposed';
export interface PreviewRequest { identity: PreviewIdentity; sequence: number; requestId: string }
export interface PreviewCapture<T> {
  identity: PreviewIdentity; captureId: string;
  provenance: { kind: 'fixture'; fixtureId: string } | { kind: 'saved'; revision: string };
  content: T;
}
export const identityKey = (value: PreviewIdentity) => JSON.stringify([value.subjectId, value.sessionId, value.applicationId, value.artifactKey]);
export class PreviewLifecycle<T> {
  private value: { state: PreviewState; identity: PreviewIdentity; pending?: PreviewRequest; last?: PreviewCapture<T>; reason?: string };
  private sequence = 0;
  constructor(identity: PreviewIdentity) {
    if (Object.values(identity).some(value => typeof value !== 'string' || !value || value.length > 4096) || Object.keys(identity).length !== 4) throw new Error('PREVIEW_IDENTITY_INVALID');
    this.value = { state: 'empty', identity: structuredClone(identity) };
  }
  get snapshot() { return structuredClone(this.value); }
  refresh(): PreviewRequest {
    if (this.value.state === 'disposed' || this.value.state === 'revoked') throw new Error('PREVIEW_SESSION_CLOSED');
    const sequence = ++this.sequence;
    const pending = { identity: structuredClone(this.value.identity), sequence, requestId: `request-${sequence}` };
    this.value = { ...this.value, state: 'capturing', pending, reason: undefined };
    return structuredClone(pending);
  }
  private matches(request: PreviewRequest) {
    return this.value.state === 'capturing' && this.value.pending?.sequence === request.sequence &&
      this.value.pending.requestId === request.requestId && identityKey(request.identity) === identityKey(this.value.identity);
  }
  succeed(request: PreviewRequest, capture: PreviewCapture<T>): boolean {
    if (!this.matches(request) || identityKey(capture.identity) !== identityKey(this.value.identity) || !capture.captureId) return false;
    if (this.value.last?.captureId === capture.captureId && JSON.stringify(this.value.last.provenance) !== JSON.stringify(capture.provenance)) return false;
    this.value = { state: 'ready', identity: this.value.identity, last: structuredClone(capture) }; return true;
  }
  fail(request: PreviewRequest, reason: string): boolean {
    if (!this.matches(request)) return false;
    this.value = { ...this.value, state: this.value.last ? 'stale' : 'unavailable', pending: undefined, reason }; return true;
  }
  invalidate(reason: string) {
    if (this.value.state === 'disposed' || this.value.state === 'revoked') return;
    this.sequence++; this.value = { ...this.value, state: this.value.last ? 'stale' : 'unavailable', pending: undefined, reason };
  }
  revoke(reason: string) {
    if (this.value.state === 'disposed') return;
    this.sequence++; this.value = { state: 'revoked', identity: this.value.identity, reason };
  }
  dispose() { this.sequence++; this.value = { state: 'disposed', identity: this.value.identity }; }
}
