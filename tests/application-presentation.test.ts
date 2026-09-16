import { describe, expect, it } from 'vitest';
import { defaultPresentation, renderPresentationCss, validatePresentation } from '../src/server/application-presentation.js';

describe('application presentation contracts', () => {
  it('seeds portable application styling defaults', () => {
    const presentation = defaultPresentation();
    expect(presentation.tokens['--app-color-primary']).toBe('#1f4f8f');
    expect(presentation.assets).toEqual([]);
  });

  it('rejects tokens that cannot be emitted as CSS custom properties', () => {
    expect(() => validatePresentation({ ...defaultPresentation(), tokens: { color: 'red' } })).toThrow('CSS custom properties');
  });

  it('keeps assets portable and emits the declared cascade', () => {
    const presentation = validatePresentation({
      ...defaultPresentation(),
      typography: { '--app-font-body': 'Inter, sans-serif' },
      css: '.welcome { color: var(--app-color-primary); }',
      assets: [{ id: 'brand-mark', name: 'Brand mark', type: 'logo', path: 'brand/mark.svg', alt: 'Brand', active: true }],
    });
    const css = renderPresentationCss(presentation);
    expect(css).toContain(':root');
    expect(css).toContain('--app-font-body: Inter, sans-serif;');
    expect(css).toContain('.welcome');
  });

  it('rejects asset paths that leave application presentation storage', () => {
    expect(() => validatePresentation({ ...defaultPresentation(), assets: [{ id: 'bad', name: 'Bad', type: 'image', path: '../outside.png', active: true }] })).toThrow('within presentation/assets');
  });
});
