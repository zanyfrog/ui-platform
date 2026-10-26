import bootstrap from './bootstrap.txt?raw';
import { identityKey, type PreviewIdentity } from './lifecycle.js';
import { validateSample, type FixtureSample } from './samples.js';
import { validChannel, type FixtureChannel } from './protocol.js';

const attribute = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
export async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}
export async function fixtureCaptureId(sample: FixtureSample) {
  return `fixture-sha256:${await digest(JSON.stringify({ policy: 'fixture-sample-policy-v2', renderer: await digest(bootstrap), sample }))}`;
}
/** Only one fixed script is admitted. No network resources, source code, imports, credentials or effect adapters. */
export async function fixtureDocument(channel: FixtureChannel, parentOrigin: string) {
  const script = bootstrap.replace(/<\/script/gi, '<\\/script');
  const hash = await digest(script);
  const csp = `default-src 'none'; script-src 'sha256-${hash}'; script-src-attr 'none'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; font-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'`;
  return `<!doctype html><html data-channel="${attribute(JSON.stringify(channel))}" data-parent-origin="${attribute(parentOrigin)}"><head><meta http-equiv="Content-Security-Policy" content="${attribute(csp)}"><meta name="referrer" content="no-referrer"><title>Restricted fixture</title></head><body><script>${script}</script></body></html>`;
}
export class FixtureHost {
  private frame?: HTMLIFrameElement;
  private cancel?: () => void;
  constructor(private readonly container: HTMLElement) {}
  clear() { this.cancel?.(); this.cancel = undefined; this.frame?.remove(); this.frame = undefined; this.container.replaceChildren(); }
  async render(identity: PreviewIdentity, sequence: number, input: FixtureSample): Promise<void> {
    this.clear();
    const sample = validateSample(input);
    const frame = document.createElement('iframe'); this.frame = frame;
    frame.title = 'Restricted fixture Preview'; frame.setAttribute('sandbox', 'allow-scripts');
    frame.referrerPolicy = 'no-referrer'; frame.setAttribute('credentialless', '');
    frame.style.cssText = 'width:100%;height:260px;border:1px solid #aaa';
    const channel: FixtureChannel = { nonce: crypto.randomUUID(), session: crypto.randomUUID(), identity: identityKey(identity), sequence };
    const source = await fixtureDocument(channel, location.origin);
    if (this.frame !== frame) throw new Error('FIXTURE_RENDER_CANCELED');
    return new Promise((resolve, reject) => {
      const finish = (error?: string) => {
        clearTimeout(timer); window.removeEventListener('message', receive); frame.onload = null;
        if (this.frame === frame) this.cancel = undefined;
        if (error) { frame.remove(); reject(new Error(error)); } else resolve();
      };
      const receive = (event: MessageEvent) => {
        if (this.frame !== frame || event.source !== frame.contentWindow || event.origin !== 'null' || !validChannel(event.data, channel) || event.data.type === 'render') return;
        finish(event.data.type === 'ready' ? undefined : event.data.reason ?? 'FIXTURE_UNAVAILABLE');
      };
      const timer = setTimeout(() => finish('FIXTURE_BOOTSTRAP_UNAVAILABLE'), 5000);
      this.cancel = () => finish('FIXTURE_RENDER_CANCELED');
      window.addEventListener('message', receive);
      // '*' is necessary for the opaque target; exact Window + nonce + identity + sequence are checked at each end.
      frame.onload = () => frame.contentWindow?.postMessage({ ...channel, type: 'render', sample }, '*');
      frame.srcdoc = source; this.container.replaceChildren(frame);
    });
  }
}
