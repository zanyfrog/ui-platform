import type { SourceRequest } from '../artifact-editor/specialized-transport.js';

// Deliberately narrower than the advanced literal URL policy.
export const isApplicationImage = (path: string) => /^assets\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(svg|png|jpg|jpeg|webp|ico)$/.test(path);
export const defaultAssetPath = (name: string) => 'assets/images/' + name.toLowerCase().replace(/[^a-z0-9.\-]/g, '-');

/** The existing asset-info / expectedHash / binary upload contract. */
export async function uploadApplicationAsset(endpoint: string, request: SourceRequest, file: File, path: string,
  current: () => boolean = () => true, replace: (message: string) => boolean = confirm): Promise<boolean> {
  if (!current()) throw new Error('Image selection changed. Reopen the chooser.');
  const info = await request<{ hash: string | null }>(`${endpoint}?info=1&path=${encodeURIComponent(path)}`);
  if (!current()) throw new Error('Image selection changed. Reopen the chooser.');
  if (info.hash && !replace(`Replace the existing Application asset at ${path}?`)) return false;
  if (!current()) throw new Error('Image selection changed. Reopen the chooser.');
  const data = new FormData(); data.set('asset', file); data.set('path', path); data.set('expectedHash', info.hash ?? '');
  await request(endpoint, { method: 'POST', body: data });
  return true;
}

export function chooseApplicationImage(base: string, request: SourceRequest, current: () => boolean): Promise<string | undefined> {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', 'Choose Application image');
    dialog.innerHTML = '<h3>Choose Application image</h3><p role="status" aria-live="polite"></p><label>Application images<select aria-label="Application images" size="6"></select></label><button data-use>Use selected image</button><button data-refresh>Refresh images</button><details><summary>Upload Application image</summary><p>Requires Application presentation edit permission.</p><label>Application image file<input type="file" accept=".svg,.png,.jpg,.jpeg,.webp,.ico"></label><label>Asset source path<input data-path value="assets/images/image.png"></label><button data-upload>Upload Application asset</button></details><button data-cancel>Cancel</button>';
    const status = dialog.querySelector<HTMLElement>('[role=status]')!, choices = dialog.querySelector('select')!;
    const use = dialog.querySelector<HTMLButtonElement>('[data-use]')!, upload = dialog.querySelector<HTMLButtonElement>('[data-upload]')!;
    const refresh = dialog.querySelector<HTMLButtonElement>('[data-refresh]')!;
    const file = dialog.querySelector<HTMLInputElement>('[type=file]')!, path = dialog.querySelector<HTMLInputElement>('[data-path]')!;
    const endpoint = `${base}/composition-asset`;
    let closed = false, busy = false, result: string | undefined, listed: string[] = [];
    const valid = () => !closed && dialog.isConnected && current();
    const assert = () => { if (!valid()) throw new Error('Image, Application or editor session changed. Cancel and reopen the chooser.'); };
    const failure = (error: unknown) => {
      const denied = [401, 403].includes((error as { status?: number }).status ?? 0);
      status.textContent = `${denied ? 'Access denied' : 'Image operation failed'}: ${error instanceof Error ? error.message : String(error)} Refresh images or cancel and reopen.`;
    };
    const run = (operation: () => Promise<void>) => async () => {
      if (busy || closed) return;
      busy = true; use.disabled = upload.disabled = refresh.disabled = true;
      try { assert(); await operation(); } catch (error) { if (!closed) failure(error); }
      finally { busy = false; use.disabled = !listed.length; upload.disabled = refresh.disabled = false; }
    };
    const list = async () => {
      listed = []; choices.replaceChildren(); status.textContent = 'Loading Application images…';
      const value = await request<{ assets: string[] }>(`${endpoint}?list=1`); assert();
      const counts = new Map<string, number>(); for (const p of value.assets) counts.set(p, (counts.get(p) ?? 0) + 1);
      listed = value.assets.filter(p => isApplicationImage(p) && counts.get(p) === 1);
      for (const p of listed) { const option = document.createElement('option'); option.value = p; option.textContent = `${p.split('/').pop()} — ${p}`; choices.append(option); }
      choices.selectedIndex = listed.length ? 0 : -1;
      status.textContent = listed.length ? 'Choose an image. Saved Preview reports images that cannot load or decode.' : 'No eligible Application images. Upload an image if authorized, or refresh.';
    };
    refresh.onclick = run(list);
    use.onclick = run(async () => {
      const selected = choices.value;
      if (!isApplicationImage(selected) || !listed.includes(selected)) throw new Error('Choose an eligible, unambiguous Application image.');
      const info = await request<{ path: string; hash: string | null }>(`${endpoint}?info=1&path=${encodeURIComponent(selected)}`); assert();
      if (info.path !== selected || !info.hash) throw new Error('The selected image is missing or unavailable. Refresh images.');
      result = selected; dialog.close();
    });
    file.onchange = () => { if (file.files?.[0]) path.value = defaultAssetPath(file.files[0].name); };
    upload.onclick = run(async () => {
      if (!file.files?.[0] || !isApplicationImage(path.value)) throw new Error('Choose a supported image file and valid Application image path.');
      if (await uploadApplicationAsset(endpoint, request, file.files[0], path.value, valid)) {
        assert(); await list();
      }
    });
    dialog.querySelector<HTMLButtonElement>('[data-cancel]')!.onclick = () => dialog.close();
    dialog.onclose = () => { closed = true; dialog.remove(); resolve(result); };
    document.body.append(dialog); dialog.showModal(); void run(list)();
  });
}
