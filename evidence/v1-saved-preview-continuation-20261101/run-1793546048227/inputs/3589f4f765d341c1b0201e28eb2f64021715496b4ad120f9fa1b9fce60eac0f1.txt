import type { ArtifactMetadata, LayoutRule } from '@ui-platform/visual-artifacts';
import { appearanceFields, type AppearanceProperty } from './appearance-css.js';

function field(parent: HTMLElement, name: string, input: HTMLElement) {
  const label = document.createElement('label'); label.append(name, input); parent.append(label);
}
function choice(name: string, values: Array<[string, string]>, value: string) {
  const select = document.createElement('select'); select.setAttribute('aria-label', name);
  for (const [label, value] of values) select.add(new Option(label, value)); select.value = value; return select;
}
function appearancePreset(property: AppearanceProperty, value: string): string {
  if (property === 'color' || property === 'background-color') return ({ '#ffffff': 'White', '#172033': 'Dark ink', '#e8f1ff': 'Pale blue', '#f5f7fb': 'Soft grey', '#2456a6': 'Blue', '#526078': 'Slate', transparent: 'Transparent' } as Record<string, string>)[value] ?? value;
  if (property === 'font-weight') return ({ '400': 'Regular', '500': 'Medium', '600': 'Semibold', '700': 'Bold', '800': 'Extra bold' } as Record<string, string>)[value] ?? value;
  if (property === 'font-size') return `${({ '16px': 'Body', '20px': 'Large body', '24px': 'Small heading', '32px': 'Heading', '48px': 'Large heading' } as Record<string, string>)[value] ?? 'Custom'} (${value})`;
  return value[0].toUpperCase() + value.slice(1);
}
export function appearanceControls(parent: HTMLElement, id: string, values: Partial<Record<AppearanceProperty, string>>, change: (property: AppearanceProperty, value: string) => void) {
  const group = document.createElement('fieldset'), legend = document.createElement('legend'); legend.textContent = 'Appearance'; group.append(legend);
  const note = document.createElement('p'); note.textContent = `Selected HTML element: ${id}. Base viewport only. Empty means stylesheet inheritance; shared styles are unchanged.`; group.append(note);
  for (const property of Object.keys(appearanceFields) as AppearanceProperty[]) {
    const spec = appearanceFields[property], input = document.createElement('input'); input.value = values[property] ?? ''; input.placeholder = 'Use stylesheet inheritance'; input.setAttribute('aria-label', spec.label);
    input.onchange = () => change(property, input.value);
    field(group, spec.label, input);
    const presets = choice(`${spec.label} preset`, [['Use stylesheet inheritance', ''], ...spec.presets.map(value => [appearancePreset(property, value), value] as [string, string])], values[property] ?? '');
    presets.onchange = () => change(property, presets.value); group.append(presets);
    const reset = document.createElement('button'); reset.textContent = `Reset ${spec.label}`; reset.onclick = () => change(property, ''); group.append(reset);
  }
  parent.append(group);
}
type Breakpoint = 'base' | 'tablet' | 'mobile';
const fields: Array<[keyof LayoutRule, string, string[]]> = [
  ['padding', 'Padding', ['0px', '0.5rem', '1rem', '2rem', '32px']], ['margin', 'Margin', ['0px', '0.5rem', '1rem', '2rem', 'auto']], ['gap', 'Gap', ['0px', '0.5rem', '1rem', '2rem']],
  ['width', 'Width', ['100%', '75%', '50%', '320px', 'auto']], ['height', 'Height', ['auto', '100%', '240px', '20rem']],
  ['display', 'Display (advanced)', ['block', 'flex', 'grid', 'none']], ['gridTemplateColumns', 'Grid columns', ['1fr', '1fr 1fr', '1fr 1fr 1fr']], ['gridColumn', 'Grid span', ['auto', 'span 2', '1 / -1']],
  ['flexDirection', 'Flex direction', ['row', 'column']], ['alignItems', 'Item alignment (advanced)', ['start', 'center', 'end', 'stretch']], ['justifyContent', 'Content alignment (advanced)', ['start', 'center', 'end', 'space-between', 'space-around']],
];
export function layoutControls(parent: HTMLElement, wrapper: string, selected: string, metadata: () => ArtifactMetadata, change: (breakpoint: Breakpoint, values: Partial<LayoutRule>) => void, viewport: Breakpoint = 'base', remember: (viewport: Breakpoint) => void = () => {}) {
  const group = document.createElement('fieldset'), legend = document.createElement('legend'); legend.textContent = 'Space and layout'; group.append(legend);
  const note = document.createElement('p'); note.textContent = `Layout wrapper: ${wrapper} (${wrapper === selected ? 'selected wrapper' : 'immediate parent wrapper'}). Appearance targets the selected element separately.`; group.append(note);
  const breakpoint = choice('Breakpoint', [['Desktop (base)', 'base'], ['Tablet (up to 1023px)', 'tablet'], ['Mobile (up to 639px)', 'mobile']], viewport); breakpoint.dataset.breakpoint = ''; field(group, 'Viewport override', breakpoint);
  const host = document.createElement('div'); host.dataset.layout = ''; group.append(host); parent.append(group);
  const render = () => {
    host.replaceChildren(); const bp = breakpoint.value as Breakpoint, layout = metadata().layout?.[wrapper] ?? {}, values = layout[bp] ?? {};
    const effective = { ...layout.base, ...(bp !== 'base' ? layout.tablet : {}), ...(bp === 'mobile' ? layout.mobile : {}) };
    const arrangement = choice('Layout arrangement', [['Inherit / reset arrangement', ''], ['Block', 'block'], ['Row', 'row'], ['Column', 'column'], ['Grid', 'grid']], values.display === 'flex' ? values.flexDirection ?? 'row' : values.display ?? '');
    arrangement.onchange = () => { const v = arrangement.value; change(bp, { display: (v === 'row' || v === 'column' ? 'flex' : v) as LayoutRule['display'], flexDirection: v === 'row' || v === 'column' ? v : undefined }); }; field(host, 'Arrange content', arrangement);
    const column = effective.display === 'flex' && effective.flexDirection === 'column';
    for (const [label, key] of [['Horizontal alignment', column ? 'alignItems' : 'justifyContent'], ['Vertical alignment', column ? 'justifyContent' : 'alignItems']] as const) {
      const options: Array<[string, string]> = [['Inherit', ''], ['Start', 'start'], ['Center', 'center'], ['End', 'end'], ...(key === 'alignItems' ? [['Stretch', 'stretch'] as [string, string]] : [['Space between', 'space-between'] as [string, string]])];
      const control = choice(label, options, values[key] ?? ''); control.onchange = () => change(bp, { [key]: control.value || undefined }); field(host, label, control);
    }
    const help = document.createElement('p'); help.textContent = 'Empty/reset removes this viewport override. Tablet also applies on Mobile unless overridden. px, rem and % presets are available; advanced fields retain existing CSS entry.'; host.append(help);
    for (const [key, label, presets] of fields) {
      const input = document.createElement('input'); input.value = values[key] ?? ''; input.placeholder = 'Inherit'; input.setAttribute('aria-label', `Layout ${bp} ${key}`); input.onchange = () => change(bp, { [key]: input.value || undefined }); field(host, label, input);
      const preset = choice(`${label} preset`, [['Inherit', ''], ...presets.map(value => [value, value] as [string, string])], values[key] ?? ''); preset.onchange = () => change(bp, { [key]: preset.value || undefined }); host.append(preset);
      const reset = document.createElement('button'); reset.textContent = `Reset ${label}`; reset.onclick = () => change(bp, { [key]: undefined }); host.append(reset);
    }
  };
  breakpoint.onchange = () => { remember(breakpoint.value as Breakpoint); render(); }; render();
}
