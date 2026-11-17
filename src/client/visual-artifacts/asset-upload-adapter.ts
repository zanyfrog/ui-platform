import '@ui-base/assets';
import type { SourceRequest } from '../artifact-editor/specialized-transport.js';
import { defaultAssetPath, uploadApplicationAsset } from './image-selection.js';

/** Presentation only: composition paths and expected hashes remain the storage contract. */
export function mountCompositionUploader(target: HTMLElement, endpoint: string, capture: () => SourceRequest, current: () => boolean, saved: (path: string) => void) {
  const uploader = document.createElement('uib-asset-uploader') as HTMLElement & { uploadPolicy: object };
  uploader.setAttribute('mode', 'minimal');
  uploader.setAttribute('heading', 'Upload Application asset');
  uploader.setAttribute('embedded', '');
  uploader.uploadPolicy = { allowExternalUrl: false, allowJsonAsset: false, allowComponentConfig: false, allowedMimeTypes: [], maxFileSizeBytes: 100 * 1024 * 1024 };
  const path = document.createElement('input'); path.setAttribute('aria-label', 'Asset source path'); path.placeholder = 'Automatic: assets/images/<file-name>';
  const label = document.createElement('label'); label.append('Asset source path', path);
  const help = document.createElement('p'); help.textContent = 'Leave the path blank to derive it from the file name on upload. Replacing an existing asset requires confirmation.';
  const status = document.createElement('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  target.append(label, help, uploader, status);
  let automaticPath = true;
  path.addEventListener('input', () => { automaticPath = !path.value; });
  let busy = false;
  uploader.addEventListener('uib-asset-upload-invalid', event => { status.textContent = (event as CustomEvent).detail.errors.join(' '); });
  uploader.addEventListener('uib-asset-upload-request', event => { void (async () => {
    if (busy) return;
    busy = true; uploader.inert = true; path.disabled = true;
    try {
      const file = (event as CustomEvent).detail.request.file as File | null;
      if (!file) throw new Error('Choose a local file.');
      status.textContent = 'Uploading…';
      const destination = automaticPath ? defaultAssetPath(file.name) : path.value;
      path.value = destination;
      if (await uploadApplicationAsset(endpoint, capture(), file, destination, current)) { status.textContent = `Saved ${destination}.`; if (current()) saved(destination); }
      else status.textContent = 'Replacement canceled. No asset changed.';
    } catch (error) { status.textContent = `${[401, 403].includes((error as { status?: number }).status ?? 0) ? 'Access denied' : 'Upload failed'}: ${error instanceof Error ? error.message : String(error)}`; }
    finally { busy = false; uploader.inert = false; path.disabled = false; }
  })(); });
}
