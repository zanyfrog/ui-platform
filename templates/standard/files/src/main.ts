import '@ui-app/app-services';
import config from '../app.settings.json';
const pages = import.meta.glob<{ render: (context: { settings: typeof config; route: string; navigate: (url: string) => void }) => string | Promise<string> }>('./pages/**/*.ts');
const root = document.querySelector('#app');
const base = import.meta.env.BASE_URL;
const route = '/' + window.location.pathname.slice(base.length).replace(/^\/+|\/+$/g, '');
const load = pages['./pages' + (route === '/' ? '/index' : route) + '.ts'] ?? pages['./pages' + route + '/index.ts'];
const navigate = (url: string) => { window.location.href = base + url.replace(/^\//, ''); };
document.title = config.application.name;
if (load) {
  const page = await load();
  root!.innerHTML = await page.render({ settings: config, route, navigate });
} else { root!.textContent = 'Page not found'; }

