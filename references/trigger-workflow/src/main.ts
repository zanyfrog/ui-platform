import source from './page.html?raw';
import metadata from './page.visual.json';
import css from './page.css?raw';
import * as functions from './page.functions';
import { components, packages } from 'virtual:uip-visual-artifacts';
import { createVisualPage } from '@ui-platform/visual-artifacts/runtime';
import type { ArtifactMetadata } from '@ui-platform/visual-artifacts';
import { createApplicationDataServices } from '@uib/platform-core/application-data';
const { render } = createVisualPage({ source, css, metadata: metadata as ArtifactMetadata, functions }, { components, packages, services: createApplicationDataServices() });
function show() { document.querySelector('#app')!.innerHTML = render({}); }
document.querySelector('#login')!.addEventListener('click', async () => {
  const session = await fetch('/api/development-identity/session').then(r => r.json());
  const response = await fetch('/api/development-identity/session', { method: 'POST', headers: { 'content-type': 'application/json', 'x-v1-csrf': session.csrfToken }, body: JSON.stringify({ email: 'admin@example.local' }) });
  document.querySelector('#identity')!.textContent = response.ok ? 'Development admin signed in' : 'Sign-in failed';
}); show();
