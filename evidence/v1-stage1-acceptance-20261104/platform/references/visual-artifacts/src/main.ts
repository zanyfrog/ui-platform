import { render, route } from './pages/customers';
const navigate = (to: string) => { history.pushState({}, '', to); show(); };
function show() {
  document.querySelector('#app')!.innerHTML = location.pathname === route || location.pathname === '/' ? render({ route: location.pathname, navigate }) : '<p>Page not found</p>';
}
window.addEventListener('popstate', show);
show();
