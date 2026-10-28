import * as anchor from '../../../../apps/v1-identity-fixture/src/pages/v1-anchor-navigation-20261028/index';
import * as home from '../../../../apps/v1-identity-fixture/src/pages/home/index';
import * as about from '../../../../apps/v1-identity-fixture/src/pages/about/index';
import * as contact from '../../../../apps/v1-identity-fixture/src/pages/contact/index';
const pages = [anchor, home, about, contact];
const paths = pages.map(page => page.route);
const resolve = (path: string) => pages.filter(page => page.route === (path === '/' ? '/home' : path));
const navigate = (to: string) => {
  if (resolve(to).length !== 1) return;
  history.replaceState({ ...history.state, pageScroll: scrollY }, '');
  history.pushState({}, '', to); show(true);
};
function show(fresh = false) {
  const matches = resolve(location.pathname);
  document.querySelector('#app')!.innerHTML = matches.length === 1 ? matches[0].render({ route: location.pathname, navigate, pageFragmentNavigation: true, pageRoutes: paths }) : '<p>Page not found</p>';
  requestAnimationFrame(() => {
    if (location.hash) return;
    if (!fresh) { scrollTo(0, Number(history.state?.pageScroll ?? 0)); return; }
    scrollTo(0, 0);
    const root = document.querySelector('#app > *')?.querySelector('[data-uip-artifact]')?.shadowRoot ?? document.querySelector('#app > *')?.firstElementChild?.shadowRoot;
    const target = root?.querySelector<HTMLElement>('h1,main,section');
    if (target) { const temporary = !target.hasAttribute('tabindex'); if (temporary) { target.tabIndex = -1; target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true }); } target.focus({ preventScroll: true }); }
  });
}
window.addEventListener('popstate', () => show());
show();
