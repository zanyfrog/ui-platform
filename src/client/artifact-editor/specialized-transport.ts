export type SourceRequest = <T>(url: string, init?: RequestInit) => Promise<T>;
import { sourceSaved } from './saved-source.js';
export interface SourceTransportOptions { request?: SourceRequest; captureRequest?: () => SourceRequest; applicationId?: string }

/** Capture authority when an edit is scheduled, never when its tab later saves. */
export async function specializedTransport(options: SourceTransportOptions, revoked: () => void) {
  let binding: { headers(): Promise<Record<string, string>>; assert(): void; revoke(): void } | undefined;
  let unsubscribe = () => {};
  if (import.meta.env.DEV && !options.request) {
    const session = await import('./session.js');
    binding = session.createEditorSessionBinding();
    try { await binding.headers(); }
    catch (error) {
      binding.revoke(); binding = undefined;
      if ((error as { code?: string }).code !== 'editor.disabled') throw error;
    }
    if (binding) unsubscribe = session.subscribeEditorSession(() => { try { binding!.assert(); } catch { revoked(); } });
  }
  const request: SourceRequest = options.request ?? (async <T>(url: string, init?: RequestInit) => {
    const headers = await binding?.headers(); binding?.assert();
    const response = await fetch(url, { ...init, headers: { ...headers, ...(options.applicationId ? { 'x-editor-application-id': options.applicationId } : {}), ...(init?.body instanceof FormData ? {} : { 'content-type': 'application/json' }), ...init?.headers } });
    const result = await response.json(); binding?.assert();
    if (!response.ok) throw Object.assign(new Error(result.error ?? result.code ?? 'Source request failed.'), { status: response.status, code: result.code });
    if (init?.method === 'PUT') sourceSaved(url);
    return result as T;
  });
  return { request, capture: options.captureRequest ?? (() => { binding?.assert(); return request; }), dispose() { unsubscribe(); binding?.revoke(); } };
}
