import '@ui-app/app-services';
import '@ui-base/core/styles.css';
import '@ui-base/theme/styles.css';
import '@ui-base/design-system/styles.css';
import '@ui-base/ui/styles.css';
import '@ui-base/hero';
import { mountComposedPage } from '@ui-platform/visual-artifacts/runtime';
import { matchCompositionRoute } from '@ui-platform/visual-artifacts';
import { createApplicationDataServices } from '@uib/platform-core/application-data';
import { definition, platformComponents, assetUrls } from 'virtual:uip-application-composition';
import { packages } from 'virtual:uip-visual-artifacts';
const root = document.querySelector<HTMLElement>('#app')!;
const base = import.meta.env.BASE_URL;
const pathname = '/' + location.pathname.slice(base.length).replace(/^\/+|\/+$/g, '');
const match = matchCompositionRoute(definition.routes, pathname);
document.title = definition.settings.branding.applicationName;
const favicon = definition.settings.branding.favicon;
if (favicon && assetUrls[favicon]) { const link = document.createElement('link'); link.rel = 'icon'; link.href = assetUrls[favicon]; document.head.append(link); }
if (match) {
  const page = definition.pages.find(page => page.metadata.artifactId === match.route.pageId)!;
  const instance = mountComposedPage(definition, page, { components: platformComponents, packages, routeId: match.route.routeId,
    route: { path: pathname, ...match.params }, services: createApplicationDataServices(), assetUrl: relative => assetUrls[relative] ?? relative,
    navigate: to => { location.href = base + to.replace(/^\//, ''); } });
  instance.root.addEventListener('click', event => {
    const anchor = event.composedPath().find(item => item instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined;
    if (anchor?.getAttribute('href')?.startsWith('/') && anchor.target === '_self') anchor.href = base + anchor.getAttribute('href')!.slice(1);
  }, { capture: true });
  root.replaceChildren(instance.host);
} else root.textContent = 'Page not found';
