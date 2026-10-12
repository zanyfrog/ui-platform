import { render as registration } from './pages/register';
import { render as edit } from './pages/edit';
const navigate = (to: string) => { history.pushState({}, '', to); show(); };
function show() {
  const match = /^\/people\/([^/]+)\/edit$/.exec(location.pathname);
  document.querySelector('#app')!.innerHTML = match ? edit({ navigate, route: location.pathname, params: { id: decodeURIComponent(match[1]) } }) : registration({ navigate });
}
document.querySelector('#login')!.addEventListener('click', async () => {
  const session = await fetch('/api/development-identity/session').then(r => r.json());
  const result = await fetch('/api/development-identity/session', { method: 'POST', headers: { 'content-type': 'application/json', 'x-v1-csrf': session.csrfToken }, body: JSON.stringify({ email: 'admin@example.local' }) });
  document.querySelector('#identity')!.textContent = result.ok ? 'Development admin signed in' : 'Sign-in failed'; show();
});
window.addEventListener('popstate', show); show();
