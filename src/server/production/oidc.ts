import type { IncomingMessage } from 'node:http';
import * as oidc from 'openid-client';
import type { SecureSessions } from './sessions.js';
import { cookie, deny, digest, noActor, origin, random } from './boundary.js';

export interface Auth0Configuration { issuer: string; clientId: string; clientSecret: string; origin: string; applicationId: string }
export async function discoverAuth0(settings: Auth0Configuration): Promise<oidc.Configuration> {
  origin(settings.origin);
  const issuer = new URL(settings.issuer);
  if (issuer.protocol !== 'https:' || issuer.username || issuer.password || issuer.search || issuer.hash || !settings.clientId || !settings.clientSecret) deny();
  const config = await oidc.discovery(issuer, settings.clientId, { id_token_signed_response_alg: 'RS256' }, oidc.ClientSecretPost(settings.clientSecret));
  if (config.serverMetadata().issuer !== settings.issuer) deny();
  return config;
}
type Transaction = { verifier: string; nonce: string; state: string; expires: number; returnTo: string };
/** Configuration is host-owned; no issuer, audience, role or redirect is accepted from browser input. */
export class OidcLogin {
  private readonly transactions = new Map<string, Transaction>();
  readonly transactionCookie = '__Host-uib_login';
  readonly callback: string;
  constructor(private readonly config: oidc.Configuration, private readonly sessions: SecureSessions, private readonly now = Date.now) {
    const issuer = new URL(config.serverMetadata().issuer!);
    if (issuer.protocol !== 'https:' || config.clientMetadata().client_id !== sessions.audience) deny();
    // Code-flow TLS validation alone is insufficient for P1: require signed ID-token verification as well.
    oidc.enableNonRepudiationChecks(config);
    this.callback = sessions.publicOrigin + '/auth/callback';
  }
  async start(request: IncomingMessage, returnTo = '/') {
    noActor(request);
    if (!returnTo.startsWith('/') || returnTo.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(returnTo) || new URL(returnTo, this.sessions.publicOrigin).origin !== this.sessions.publicOrigin) deny();
    for (const [key, t] of this.transactions) if (t.expires <= this.now()) this.transactions.delete(key);
    if (this.transactions.size >= 1024) deny();
    const old = cookie(request, this.transactionCookie); if (old) this.transactions.delete(digest(old));
    const browser = random(), verifier = oidc.randomPKCECodeVerifier(), nonce = oidc.randomNonce(), state = oidc.randomState();
    this.transactions.set(digest(browser), { verifier, nonce, state, expires: this.now() + 300_000, returnTo });
    const url = oidc.buildAuthorizationUrl(this.config, { redirect_uri: this.callback, response_type: 'code', scope: 'openid',
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier), code_challenge_method: 'S256', nonce, state, max_age: '900', acr_values: 'http://schemas.openid.net/pape/policies/2007/06/multi-factor' });
    return { url: url.href, cookie: `${this.transactionCookie}=${browser}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=300` };
  }
  async finish(request: IncomingMessage) {
    noActor(request);
    const key = cookie(request, this.transactionCookie), tx = key ? this.transactions.get(digest(key)) : undefined;
    if (key) this.transactions.delete(digest(key)); // Consume before any network await, including failures.
    if (!tx || tx.expires <= this.now()) deny();
    const url = new URL(request.url!, this.sessions.publicOrigin);
    if (url.origin !== this.sessions.publicOrigin || url.pathname !== '/auth/callback' || [...url.searchParams.keys()].some(k => !['code', 'state', 'iss', 'error', 'error_description', 'error_uri'].includes(k)) || [...new Set(url.searchParams.keys())].some(k => url.searchParams.getAll(k).length !== 1)) deny();
    const tokens = await oidc.authorizationCodeGrant(this.config, url, { pkceCodeVerifier: tx.verifier, expectedNonce: tx.nonce, expectedState: tx.state, idTokenExpected: true, maxAge: 900 });
    const claims = tokens.claims();
    if (!claims || claims.iss !== this.config.serverMetadata().issuer || typeof claims.sub !== 'string' || !claims.sub ||
        !Array.isArray(claims.amr) || !claims.amr.includes('mfa') || typeof claims.auth_time !== 'number' || this.now() / 1000 - claims.auth_time > 900) deny();
    const enrollment = await this.sessions.directory.resolve(claims.iss, claims.sub, this.sessions.applicationId);
    const issued = await this.sessions.issue(enrollment, cookie(request, this.sessions.cookieName));
    return { ...issued, returnTo: tx.returnTo, clearTransaction: `${this.transactionCookie}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0` };
  }
}
