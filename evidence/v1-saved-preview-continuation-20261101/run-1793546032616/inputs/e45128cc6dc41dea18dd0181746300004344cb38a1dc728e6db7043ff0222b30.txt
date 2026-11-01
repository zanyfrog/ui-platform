import { UibBaseElement, defineUiBaseElement, escapeHtml } from '@ui-base/core';
import { getMtIcon } from './icon-registry.js';

const styles = `
:host{display:inline-flex;width:var(--uib-icon-size,1em);height:var(--uib-icon-size,1em);line-height:1;flex:0 0 auto}*,*::before,*::after{box-sizing:border-box}.uib-icon{display:inline-flex;width:100%;height:100%;align-items:center;justify-content:center}.uib-icon svg,.uib-icon img{width:100%;height:100%;display:block}.uib-icon img{object-fit:contain}
`;

export class UibIcon extends UibBaseElement {
  static get observedAttributes() {
    return [...UibBaseElement.commonAttributes, 'name', 'src', 'url', 'size', 'decorative'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  get name() {
    return this.getAttribute('name') || '';
  }

  set name(value) {
    if (value === null || value === undefined) this.removeAttribute('name');
    else this.setAttribute('name', String(value));
  }

  get src() {
    return this.getAttribute('src') || this.getAttribute('url') || '';
  }

  set src(value) {
    if (value === null || value === undefined) this.removeAttribute('src');
    else this.setAttribute('src', String(value));
  }

  get decorative() {
    return this.hasAttribute('decorative') || (!this.label && !this.ariaLabel && !this.titleText);
  }

  set decorative(value) {
    this.toggleAttribute('decorative', Boolean(value));
  }

  render() {
    const label = this.ariaLabel || this.label || this.titleText || this.name || 'Icon';
    const aria = this.decorative
      ? 'aria-hidden="true"'
      : `role="img" aria-label="${escapeHtml(label)}"`;
    const size = this.getAttribute('size');
    const sizeStyle = size ? `:host{--uib-icon-size:${escapeHtml(size)}}` : '';
    const src = this.src;
    const body = src
      ? (
  `<img src="` +
  (escapeHtml(src)) +
  `" alt="` +
  (this.decorative ? '' : escapeHtml(label)) +
  `">`
)
      : (getMtIcon(this.name) || getMtIcon('info'));

    this.shadowRoot.innerHTML = (
  `<style>` +
  ` ` +
  (styles) +
  ` ` +
  (sizeStyle) +
  ` ` +
  `</style>` +
  `<span class="uib-icon" part="icon" ` +
  (aria) +
  `> ` +
  (body) +
  ` ` +
  `</span>`
);
  }
}

defineUiBaseElement('uib-icon', UibIcon);
