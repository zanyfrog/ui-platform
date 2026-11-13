import { createHash, randomBytes } from 'node:crypto';
export interface PairingParent { revision: string; userId: string | null; expires: number }
type Binding<P> = { parent: P; revision: string; userId: string; expires: number };
const secret = () => randomBytes(32).toString('hex');
export const pairingChallenge = (proof: string) => createHash('sha256').update(proof).digest('hex');
/** Instance-local, memory-only authority. A code is useless without CLI proof. */
export class CliPairing<P extends PairingParent> {
  private codes = new Map<string, Binding<P> & { challenge: string }>();
  private credentials = new Map<string, Binding<P>>();
  constructor(private readonly validParent: (p: P) => boolean, private readonly now = Date.now) {}
  private valid(b: Binding<P>) { return b.expires > this.now() && b.parent.expires > this.now() && b.parent.revision === b.revision && b.parent.userId === b.userId && this.validParent(b.parent); }
  create(parent: P, challenge: unknown) {
    for (const [k,b] of this.codes) if (!this.valid(b)) this.codes.delete(k);
    for (const [k,b] of this.credentials) if (!this.valid(b)) this.credentials.delete(k);
    if (typeof challenge !== 'string' || !/^[a-f0-9]{64}$/.test(challenge) || !parent.userId || !this.validParent(parent) || parent.expires <= this.now() || this.codes.size >= 128 || this.credentials.size >= 128) throw Error('CLI_PAIRING_DENIED');
    const code = secret(); this.codes.set(code, { parent, revision: parent.revision, userId: parent.userId, challenge, expires: Math.min(parent.expires, this.now()+60_000) }); return { code, expiresInSeconds: 60 };
  }
  redeem(code: unknown, proof: unknown) {
    if (typeof code !== 'string' || typeof proof !== 'string' || !/^[a-f0-9]{64}$/.test(proof)) throw Error('CLI_PAIRING_DENIED');
    const b = this.codes.get(code);
    if (!b || !this.valid(b) || pairingChallenge(proof) !== b.challenge || this.credentials.size >= 128) throw Error('CLI_PAIRING_DENIED');
    this.codes.delete(code); const credential = 'uip.'+secret();
    this.credentials.set(credential, { ...b, expires: Math.min(b.parent.expires, this.now()+300_000) });
    return { credential, expiresInSeconds: Math.max(0, Math.floor((Math.min(b.parent.expires,this.now()+300_000)-this.now())/1000)) };
  }
  parent(credential: unknown): P {
    const b = typeof credential === 'string' ? this.credentials.get(credential) : undefined;
    if (!b || !this.valid(b)) throw Error('CLI_UNAUTHENTICATED'); return b.parent;
  }
  close() { this.codes.clear(); this.credentials.clear(); }
}
