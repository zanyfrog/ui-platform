// Fixed trusted bootstrap. Bundled with the audited existing renderer; never imports fixture code.
import { renderComponentInstance } from '../../../../ui-base/packages/ui-base-ui/src/platform/renderer.js';
import { ComponentRegistry } from '../../../../ui-base/packages/ui-base-ui/src/platform/registry.js';
import manifest from '../../../../ui-base/packages/ui-base-ui/ui.component.json';
import { UibPanel } from '../../../../ui-base/packages/ui-base-ui/src/layout/index.js';
import { validateSample, inspectRoute } from './samples.js';
import { validChannel, type FixtureChannel } from './protocol.js';

const channel: FixtureChannel = JSON.parse(document.documentElement.dataset.channel!);
const parentOrigin = document.documentElement.dataset.parentOrigin!;
let rendered = false;
// Browser-native effects are canceled at the document boundary as well as by admission/CSP/sandbox.
document.addEventListener('submit', event => event.preventDefault(), true);
document.addEventListener('click', event => {
  if (event.composedPath().some(item => item instanceof Element && item.matches('a, input[type=file], [download]'))) event.preventDefault();
}, true);
document.addEventListener('dragover', event => event.preventDefault(), true);
document.addEventListener('drop', event => event.preventDefault(), true);
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== parentOrigin || !validChannel(event.data, channel) || event.data.type !== 'render' || rendered) return;
  rendered = true;
  try {
    const sample = validateSample(event.data.sample);
    let element: HTMLElement;
    if (sample.fixture === 'native-card-v1') {
      const definition = manifest.components.find(entry => entry.schemaVersion && entry.tagName === 'uib-card')!;
      const registry = new ComponentRegistry();
      registry.registerManifest({ components: [definition] }, { packageId: '@ui-base/ui' });
      element = renderComponentInstance(definition, {
        componentId: definition.identity!.componentId,
        settings: { heading: sample.heading, header: sample.header, body: sample.body, footer: sample.footer, variant: sample.variant, density: sample.density, interactionMode: sample.selectable ? 'selectable' : 'none', disabled: sample.disabled, selected: sample.selected, ariaLabel: sample.heading || 'Synthetic Card' },
      }, { registry, preview: true });
    } else if (sample.fixture === 'native-panel-v1') {
      element = document.createElement('uib-panel');
      if (!(element instanceof UibPanel)) throw new Error('PANEL_NATIVE_CLASS_UNAVAILABLE');
      for (const key of ['heading', 'variant', 'density'] as const) element.setAttribute(key, sample[key]);
      element.toggleAttribute('collapsible', sample.collapsible); element.toggleAttribute('open', sample.open);
      for (const [slot, text] of [['', sample.body], ['footer', sample.footer]]) {
        const child = document.createElement('span'); if (slot) child.slot = slot; child.textContent = text; element.append(child);
      }
    } else {
      element = document.createElement('pre'); element.inert = true;
      element.textContent = JSON.stringify(inspectRoute(sample), null, 2);
    }
    const label = document.createElement('strong');
    label.textContent = `SAMPLE DATA · ${sample.fixture === 'native-panel-v1' ? 'Native Panel layout fixture · not canonical Component parity' : sample.fixture === 'route-inspector-v1' ? 'Synthetic route-parameter inspector · no Page rendering or navigation' : 'Card fixture demonstration'}`;
    document.body.replaceChildren(label, element);
    parent.postMessage({ ...channel, type: 'ready' }, parentOrigin);
  } catch {
    document.body.textContent = 'Fixture unavailable';
    parent.postMessage({ ...channel, type: 'unavailable', reason: 'NATIVE_RENDERER_REJECTED_FIXTURE' }, parentOrigin);
  }
});
