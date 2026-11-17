// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { mountCompositionUploader } from '../src/client/visual-artifacts/asset-upload-adapter.js';
import { mountCompositionManager } from '../src/client/visual-artifacts/composition-manager.js';
import { configureAutosave } from '../src/client/artifact-editor/autosave-configuration.js';
import type { SourceRequest } from '../src/client/artifact-editor/specialized-transport.js';
import type { CompositionDefinition } from '@ui-platform/visual-artifacts';

afterEach(() => { document.body.replaceChildren(); vi.unstubAllGlobals(); });

function setup() {
  const target = document.createElement('div'); document.body.append(target);
  const request = vi.fn(async (_url: string, _init?: RequestInit): Promise<unknown> => ({ hash: null }));
  const capture = vi.fn(() => request as SourceRequest), saved = vi.fn();
  let active = true;
  mountCompositionUploader(target, '/api/apps/fixture/composition-asset', capture, () => active, saved);
  const uploader = target.querySelector('uib-asset-uploader')!;
  const path = target.querySelector('input')!, status = target.querySelector('[role="status"]')!;
  const select = (name = 'My Photo.PNG') => {
    const transfer = new DataTransfer();
    const file = new File(['fixture'], name, { type: 'image/png' }); transfer.items.add(file);
    const input = uploader.shadowRoot!.querySelector<HTMLInputElement>('[type="file"]')!;
    input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    return { file, input };
  };
  const submit = () => uploader.shadowRoot!.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
  return { target, uploader, path, status, request, capture, saved, select, submit, deactivate: () => { active = false; } };
}

it('mounts the minimal uploader using supported stable configuration', () => {
  const fixture = setup();
  expect(fixture.uploader.getAttribute('mode')).toBe('minimal');
  expect(fixture.uploader.getAttribute('heading')).toBe('Upload Application asset');
  expect(fixture.uploader.hasAttribute('embedded')).toBe(true);
  expect(fixture.uploader.shadowRoot!.querySelector('[name="name"]')).toBeNull();
  expect(fixture.path.labels).toHaveLength(1);
  expect(fixture.status.getAttribute('aria-live')).toBe('polite');
  expect(fixture.target.querySelectorAll('uib-asset-uploader')).toHaveLength(1);
  expect(fixture.target.querySelector('[type="file"]')).toBeNull();
  expect(readFileSync('src/client/visual-artifacts/asset-upload-adapter.ts', 'utf8')).not.toMatch(/shadowRoot|composedPath/);
});

it('derives the file destination, uploads its bytes and empty expected hash, and notifies the workspace callback', async () => {
  const fixture = setup(), { file, input } = fixture.select();
  const policy = (fixture.uploader as HTMLElement & { uploadPolicy: object }).uploadPolicy;
  fixture.submit();
  await vi.waitFor(() => expect(fixture.saved).toHaveBeenCalledWith('assets/images/my-photo.png'));
  expect(fixture.path.value).toBe('assets/images/my-photo.png');
  expect(fixture.request.mock.calls[0][0]).toContain('path=assets%2Fimages%2Fmy-photo.png');
  const init = fixture.request.mock.calls[1][1]!;
  expect(init.method).toBe('POST');
  const body = init.body as FormData;
  expect(body.get('asset')).toBe(file); expect(body.get('path')).toBe(fixture.path.value);
  expect(body.get('expectedHash')).toBe('');
  expect(fixture.capture).toHaveBeenCalledOnce();
  expect(fixture.status.textContent).toBe('Saved assets/images/my-photo.png.');
  expect(fixture.uploader.shadowRoot!.querySelector('[type="file"]')).toBe(input);
  expect(input.files![0]).toBe(file);
  expect((fixture.uploader as HTMLElement & { uploadPolicy: object }).uploadPolicy).toBe(policy);
  expect(fixture.path.disabled).toBe(false); expect(fixture.uploader.inert).toBe(false);
});

it('retains an explicit destination and sends the confirmed expected hash', async () => {
  const fixture = setup(); fixture.select(); fixture.path.value = 'assets/branding/logo.png';
  fixture.path.dispatchEvent(new Event('input'));
  fixture.request.mockImplementation(async () => ({ hash: 'existing-hash' }));
  const confirm = vi.fn(() => true); vi.stubGlobal('confirm', confirm);
  fixture.submit();
  await vi.waitFor(() => expect(fixture.saved).toHaveBeenCalledWith('assets/branding/logo.png'));
  expect(confirm).toHaveBeenCalledWith('Replace the existing Application asset at assets/branding/logo.png?');
  expect((fixture.request.mock.calls[1][1]!.body as FormData).get('expectedHash')).toBe('existing-hash');
});

it('derives a fresh automatic destination for each selected file', async () => {
  const fixture = setup(); fixture.select('first.png'); fixture.submit();
  await vi.waitFor(() => expect(fixture.saved).toHaveBeenCalledWith('assets/images/first.png'));
  fixture.select('second.png'); fixture.submit();
  await vi.waitFor(() => expect(fixture.saved).toHaveBeenCalledWith('assets/images/second.png'));
});

it('cancels replacements without posting or refreshing and retains file selection', async () => {
  const fixture = setup(), { input } = fixture.select();
  fixture.request.mockImplementation(async () => ({ hash: 'existing-hash' }));
  vi.stubGlobal('confirm', vi.fn(() => false)); fixture.submit();
  await vi.waitFor(() => expect(fixture.status.textContent).toContain('Replacement canceled'));
  expect(fixture.request).toHaveBeenCalledOnce(); expect(fixture.saved).not.toHaveBeenCalled();
  expect(fixture.uploader.shadowRoot!.querySelector('[type="file"]')).toBe(input);
  expect(fixture.path.disabled).toBe(false);
});

it('shows generic uploader validation errors without capturing authority or posting', () => {
  const fixture = setup(); fixture.submit();
  expect(fixture.status.textContent).toBe('Choose a local file.');
  expect(fixture.capture).not.toHaveBeenCalled(); expect(fixture.request).not.toHaveBeenCalled();
});

it.each([401, 403])('shows authorization error %s without posting or refreshing', async status => {
  const fixture = setup(); fixture.select();
  fixture.request.mockRejectedValue(Object.assign(new Error('Permission revoked'), { status })); fixture.submit();
  await vi.waitFor(() => expect(fixture.status.textContent).toBe('Access denied: Permission revoked'));
  expect(fixture.request).toHaveBeenCalledOnce(); expect(fixture.saved).not.toHaveBeenCalled();
  expect(fixture.path.disabled).toBe(false); expect(fixture.uploader.inert).toBe(false);
});

it('retains stale-hash error feedback from the protected upload operation', async () => {
  const fixture = setup(); fixture.select();
  fixture.request.mockImplementation(async (_url, init) => {
    if (init?.method === 'POST') throw Object.assign(new Error('Asset changed'), { status: 409 });
    return { hash: null };
  }); fixture.submit();
  await vi.waitFor(() => expect(fixture.status.textContent).toBe('Upload failed: Asset changed'));
  expect(fixture.saved).not.toHaveBeenCalled(); expect(fixture.request).toHaveBeenCalledTimes(2);
});

it('refuses uploads when the editor session is no longer current', async () => {
  const fixture = setup(); fixture.select(); fixture.deactivate(); fixture.submit();
  await vi.waitFor(() => expect(fixture.status.textContent).toContain('Image selection changed'));
  expect(fixture.request).not.toHaveBeenCalled(); expect(fixture.saved).not.toHaveBeenCalled();
});

it('does not post if the editor session changes during the asset-info request', async () => {
  const fixture = setup(); fixture.select();
  fixture.request.mockImplementation(async () => { fixture.deactivate(); return { hash: null }; }); fixture.submit();
  await vi.waitFor(() => expect(fixture.status.textContent).toContain('Image selection changed'));
  expect(fixture.request).toHaveBeenCalledOnce(); expect(fixture.saved).not.toHaveBeenCalled();
});

it('mounts just one upload interface in Composition and preserves workspace refresh', async () => {
  configureAutosave({ enabled: false, delayMs: 2000 });
  const target = document.createElement('div'); document.body.append(target);
  const definition = { menus: [], shells: [{ metadata: { artifactId: 'public', displayName: 'Public' } }], settings: { siteStyles: [] } } as unknown as CompositionDefinition;
  const source = { path: 'app.settings.json', hash: 'settings-hash', content: JSON.stringify({ presentation: { defaultShellId: 'public', branding: {}, siteStyles: [], theme: {} } }) };
  const request = vi.fn(async (url: string, init?: RequestInit) => url.includes('?list=1') ? { assets: [], styles: [] } : url.includes('composition-source') ? source : { hash: null });
  const manager = await mountCompositionManager(target, 'fixture', { definition, request: request as SourceRequest });
  const refresh = vi.fn(); document.addEventListener('ui-platform-workspace-change', refresh);
  try {
    expect(target.querySelectorAll('uib-asset-uploader')).toHaveLength(1);
    expect(target.querySelector('[data-asset], [data-asset-path], [data-upload-asset], [data-asset-status]')).toBeNull();
    const uploader = target.querySelector('uib-asset-uploader')!;
    const transfer = new DataTransfer(); transfer.items.add(new File(['fixture'], 'composition.png', { type: 'image/png' }));
    uploader.shadowRoot!.querySelector<HTMLInputElement>('[type="file"]')!.files = transfer.files;
    uploader.shadowRoot!.querySelector<HTMLButtonElement>('button')!.click();
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(target.querySelector('[data-asset-upload] [role="status"]')!.textContent).toBe('Saved assets/images/composition.png.');
  } finally { document.removeEventListener('ui-platform-workspace-change', refresh); await manager!.dispose(); }
});
