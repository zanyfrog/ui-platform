import { UibBaseElement, defineUiBaseElement, escapeHtml } from '@ui-base/core';
import '@ui-base/icons/icon';

const baseStyles = `
:host{display:block;color:var(--uib-color-ink,#13294b);font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.placeholder{padding:.75rem;border:1px dashed var(--uib-color-border-strong,#aab8cc);border-radius:var(--uib-radius-md,.75rem);background:var(--uib-color-surface-soft,#f8fbff);color:var(--uib-color-muted,#53657f);font-size:var(--uib-font-size-sm,.875rem)}
`;

class UibLayoutBase extends UibBaseElement {
  connectedCallback() {
    this.render();
  }
}

export class UibStack extends UibLayoutBase {
  static get observedAttributes() { return [...UibBaseElement.commonAttributes, 'gap', 'direction', 'align', 'justify']; }
  render() {
    const gap = this.getAttribute('gap') || 'var(--uib-space-3,.75rem)';
    const direction = this.getAttribute('direction') || 'column';
    const align = this.getAttribute('align') || 'stretch';
    const justify = this.getAttribute('justify') || 'start';
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = (
  `<style>` +
  ` ` +
  (baseStyles) +
  `.uib-stack{display:flex;flex-direction:` +
  (escapeHtml(direction)) +
  `;gap:` +
  (escapeHtml(gap)) +
  `;align-items:` +
  (escapeHtml(align)) +
  `;justify-content:` +
  (escapeHtml(justify)) +
  `}@media(max-width:520px){.uib-stack{flex-wrap:wrap}} ` +
  `</style>` +
  `<div class="uib-stack" part="base">` +
  `<slot>` +
  `</slot>` +
  `</div>`
);
  }
}

export class UibGrid extends UibLayoutBase {
  static get observedAttributes() { return [...UibBaseElement.commonAttributes, 'columns', 'min', 'gap']; }
  render() {
    const columns = this.getAttribute('columns');
    const min = this.getAttribute('min') || '14rem';
    const gap = this.getAttribute('gap') || 'var(--uib-space-4,1rem)';
    const template = columns ? `repeat(${Number(columns) || 1}, minmax(0, 1fr))` : `repeat(auto-fit, minmax(${min}, 1fr))`;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = (
  `<style>` +
  ` ` +
  (baseStyles) +
  `.uib-grid{display:grid;grid-template-columns:` +
  (template) +
  `;gap:` +
  (escapeHtml(gap)) +
  `}@media(max-width:520px){.uib-grid{grid-template-columns:1fr}} ` +
  `</style>` +
  `<div class="uib-grid" part="base">` +
  `<slot>` +
  `</slot>` +
  `</div>`
);
  }
}

export class UibRow extends UibLayoutBase {
  static get observedAttributes() { return [...UibBaseElement.commonAttributes, 'gap', 'align', 'justify', 'wrap']; }
  render() {
    const gap = this.getAttribute('gap') || 'var(--uib-space-3,.75rem)';
    const align = this.getAttribute('align') || 'center';
    const justify = this.getAttribute('justify') || 'start';
    const wrap = this.hasAttribute('wrap') ? 'wrap' : 'nowrap';
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = (
  `<style>` +
  ` ` +
  (baseStyles) +
  `.uib-row{display:flex;flex-direction:row;gap:` +
  (escapeHtml(gap)) +
  `;align-items:` +
  (escapeHtml(align)) +
  `;justify-content:` +
  (escapeHtml(justify)) +
  `;flex-wrap:` +
  (wrap) +
  `}@media(max-width:420px){.uib-row{flex-wrap:wrap}} ` +
  `</style>` +
  `<div class="uib-row" part="base">` +
  `<slot>` +
  `</slot>` +
  `</div>`
);
  }
}

export class UibColumn extends UibLayoutBase {
  static get observedAttributes() { return [...UibBaseElement.commonAttributes, 'gap', 'align', 'justify']; }
  render() {
    const gap = this.getAttribute('gap') || 'var(--uib-space-3,.75rem)';
    const align = this.getAttribute('align') || 'stretch';
    const justify = this.getAttribute('justify') || 'start';
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = (
  `<style>` +
  ` ` +
  (baseStyles) +
  `.uib-column{display:flex;flex-direction:column;gap:` +
  (escapeHtml(gap)) +
  `;align-items:` +
  (escapeHtml(align)) +
  `;justify-content:` +
  (escapeHtml(justify)) +
  `} ` +
  `</style>` +
  `<div class="uib-column" part="base">` +
  `<slot>` +
  `</slot>` +
  `</div>`
);
  }
}

class UibSurfaceBase extends UibLayoutBase {
  static get observedAttributes() {
    return [...UibBaseElement.commonAttributes, 'heading', 'variant', 'density'];
  }
  surfaceName = 'surface';
  defaultVariant = 'outlined';

  connectedCallback() {
    this.render();
  }

  get heading() { return this.getAttribute('heading') || this.label || ''; }
  get variant() {
    const value = (this.getAttribute('variant') || this.defaultVariant).toLowerCase();
    return ['outlined', 'elevated', 'flat'].includes(value) ? value : this.defaultVariant;
  }
  get density() {
    return this.getAttribute('density') === 'compact' ? 'compact' : 'comfortable';
  }
  hasNamedSlot(name) {
    return Array.from(this.children).some((child) => child.getAttribute?.('slot') === name);
  }
  surfaceStyles(extra = '') {
    return (
  `<style>` +
  ` ` +
  (baseStyles) +
  `.uib-surface{display:block;overflow:hidden;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);text-align:start;text-decoration:none}.uib-surface--elevated{box-shadow:var(--uib-shadow-sm,0 6px 18px rgba(10,31,68,.08))}.uib-surface--outlined{box-shadow:none}.uib-surface--flat{border-color:transparent;box-shadow:none}.uib-surface--disabled{cursor:not-allowed;opacity:.58}.uib-surface__header,.uib-surface__body,.uib-surface__footer,.uib-surface__actions{padding:var(--uib-space-4,1rem)}.uib-surface--compact .uib-surface__header,.uib-surface--compact .uib-surface__body,.uib-surface--compact .uib-surface__footer,.uib-surface--compact .uib-surface__actions{padding:var(--uib-space-3,.75rem)}.uib-surface__header{display:flex;gap:.75rem;align-items:center;justify-content:space-between;border-bottom:1px solid var(--uib-color-border,#d9e2f0);font-weight:850}.uib-surface__header[hidden],.uib-surface__footer[hidden],.uib-surface__actions[hidden],.uib-surface__media[hidden],.uib-surface__collapsible[hidden]{display:none!important}.uib-surface__footer{border-top:1px solid var(--uib-color-border,#d9e2f0);background:var(--uib-color-surface-soft,#f8fbff)}.uib-surface__actions{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:flex-end;padding-bottom:0}.uib-surface:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))} ` +
  (extra) +
  ` ` +
  `</style>`
);
  }
  headerMarkup(headingId, visible = true, after = '') {
    const heading = this.heading;
    return (
  `<div class="uib-surface__header" part="header" ` +
  (headingId ? `id="${headingId}"` : '') +
  (visible ? '' : ' hidden') +
  `>` +
  `<slot name="header">` +
  (escapeHtml(heading)) +
  `</slot>` +
  (after) +
  `</div>`
);
  }
  bodyMarkup(hidden = false) {
    return (
  `<div class="uib-surface__body" part="body"` +
  (hidden ? ' hidden' : '') +
  `>` +
  `<slot>` +
  `</slot>` +
  `</div>`
);
  }
  footerMarkup(visible = true) {
    return (
  `<div class="uib-surface__footer" part="footer"` +
  (visible ? '' : ' hidden') +
  `>` +
  `<slot name="footer">` +
  `</slot>` +
  `</div>`
);
  }
  surfaceClasses(...names) {
    return [
      'uib-surface',
      `uib-${this.surfaceName}`,
      `uib-surface--${this.variant}`,
      `uib-surface--${this.density}`,
      this.disabled ? 'uib-surface--disabled' : '',
      ...names
    ].filter(Boolean).join(' ');
  }
}

export class UibPanel extends UibSurfaceBase {
  static get observedAttributes() {
    return [...super.observedAttributes, 'collapsible', 'open'];
  }
  surfaceName = 'panel';
  defaultVariant = 'outlined';

  get collapsible() { return this.hasAttribute('collapsible'); }
  get open() { return !this.collapsible || this.hasAttribute('open'); }
  set open(value) { this.toggleAttribute('open', Boolean(value)); }

  toggle() {
    if (!this.collapsible || this.disabled) return;
    const oldValue = this.open;
    this.open = !oldValue;
    this.emitValueChange('uib-panel-toggle', oldValue, this.open);
  }

  render() {
    const headingId = this.heading ? `${this.componentId}-heading` : '';
    const hasHeader = Boolean(this.heading) || this.hasNamedSlot('header') || this.hasNamedSlot('actions') || this.collapsible;
    const hasActions = this.hasNamedSlot('actions');
    const hasFooter = this.hasNamedSlot('footer');
    const open = this.open;
    const toggleButton = this.collapsible
      ? (
  `<button class="uib-panel__toggle" part="toggle" type="button" aria-expanded="${open ? 'true' : 'false'}" ${this.disabled ? 'disabled' : ''}>` +
  `<span class="uib-panel__toggle-icon" aria-hidden="true">` +
  (open ? '-' : '+') +
  `</span>` +
  `</button>`
)
      : '';
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = (
  this.surfaceStyles(`.uib-panel .uib-surface__actions{margin-inline-start:auto;padding:0}.uib-panel__toggle{display:inline-grid;width:2rem;height:2rem;place-items:center;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-pill,999px);background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);cursor:pointer}.uib-panel__toggle:disabled{cursor:not-allowed}.uib-panel__toggle:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}.uib-panel__toggle-icon{font-size:1rem;font-weight:900;line-height:1}`) +
  `<section class="${this.surfaceClasses()}" part="base" ` +
  (headingId ? `aria-labelledby="${headingId}"` : '') +
  (this.disabled ? ' aria-disabled="true"' : '') +
  `>` +
  (hasHeader ? this.headerMarkup(headingId, true, `<div class="uib-surface__actions" part="actions"><slot name="actions"></slot></div>${toggleButton}`) : this.headerMarkup('', false)) +
  `<div class="uib-surface__collapsible" part="content"` +
  (open ? '' : ' hidden') +
  `>` +
  (hasActions && !hasHeader ? `<div class="uib-surface__actions" part="actions"><slot name="actions"></slot></div>` : '') +
  this.bodyMarkup() +
  this.footerMarkup(hasFooter) +
  `</div>` +
  `</section>`
);
    this.shadowRoot.querySelector('.uib-panel__toggle')?.addEventListener('click', () => this.toggle());
  }
}

export class UibCard extends UibSurfaceBase {
  static get observedAttributes() {
    return [...super.observedAttributes, 'href', 'target', 'rel', 'action', 'action-token', 'interactive', 'selectable', 'selected'];
  }
  surfaceName = 'card';
  defaultVariant = 'elevated';

  connectedCallback() {
    super.connectedCallback();
    this._cardSlotObserver ||= new MutationObserver((records) => {
      if (records.some((record) => record.target === this
        || (record.type === 'attributes' && record.target.parentElement === this))) this._updateCardSlots();
    });
    this._cardSlotObserver.observe(this, { childList: true, attributes: true, attributeFilter: ['slot'], subtree: true });
  }

  disconnectedCallback() {
    this._cardSlotObserver?.disconnect();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    // Selection is state on the current surface. Replacing the focused element
    // here also destroys child UI state and the browser's activation target.
    if (name === 'selected' && this.shadowRoot?.querySelector('.uib-card')) {
      const surface = this.shadowRoot.querySelector('.uib-card');
      surface.classList.toggle('uib-card--selected', this.selected);
      if (this.selectable) surface.setAttribute('aria-pressed', String(this.selected));
      return;
    }
    super.attributeChangedCallback(name, oldValue, newValue);
  }

  _updateCardSlots() {
    if (!this.shadowRoot) return;
    for (const name of ['media', 'header', 'footer']) {
      const wrapper = this.shadowRoot.querySelector(`[part="${name}"]`);
      if (wrapper) wrapper.hidden = name === 'header'
        ? !this.heading && !this.hasNamedSlot(name) : !this.hasNamedSlot(name);
    }
  }

  get href() { return this.getAttribute('href') || ''; }
  get target() { return this.getAttribute('target') || ''; }
  get rel() { return this.getAttribute('rel') || ''; }
  get action() { return this.getAttribute('action') || ''; }
  get actionToken() { return this.getAttribute('action-token') || ''; }
  get interactive() { return this.hasAttribute('interactive') || Boolean(this.href || this.action || this.actionToken || this.selectable); }
  get selectable() { return this.hasAttribute('selectable'); }
  get selected() { return this.hasAttribute('selected'); }
  set selected(value) { this.toggleAttribute('selected', Boolean(value)); }

  shouldIgnoreActivation(event, surface) {
    const interactiveSelector = 'a,button,input,select,textarea,summary,[role="button"],[role="link"],[contenteditable="true"]';
    for (const item of event?.composedPath?.() || []) {
      if (item === surface) return false;
      if (item instanceof HTMLElement && item.matches(interactiveSelector)) return true;
    }
    return false;
  }

  activate(event) {
    if (this.disabled) {
      event?.preventDefault?.();
      return;
    }
    const surface = this.shadowRoot?.querySelector('.uib-card');
    if (surface && this.shouldIgnoreActivation(event, surface)) return;
    const oldSelected = this.selected;
    if (this.selectable) {
      this.selected = !oldSelected;
      this.emitValueChange('uib-card-select', oldSelected, this.selected, { selected: this.selected });
    }
    if (this.action || this.actionToken) {
      const allowed = this.dispatchEvent(new CustomEvent('uib-card-action', {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: {
          name: this.name,
          action: this.action,
          actionToken: this.actionToken,
          selected: this.selected
        }
      }));
      if (!allowed) event?.preventDefault?.();
    }
  }

  handleKeydown(event) {
    if (!this.interactive || this.href) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const surface = this.shadowRoot?.querySelector('.uib-card');
    if (surface && this.shouldIgnoreActivation(event, surface)) return;
    event.preventDefault();
    this.activate(event);
  }

  render() {
    const hadSurfaceFocus = Boolean(this.shadowRoot?.activeElement)
      && this.shadowRoot.activeElement === this.shadowRoot.querySelector('.uib-card');
    const headingId = this.heading ? `${this.componentId}-heading` : '';
    const hasHeader = Boolean(this.heading) || this.hasNamedSlot('header');
    const hasMedia = this.hasNamedSlot('media');
    const hasFooter = this.hasNamedSlot('footer');
    const tag = this.href ? 'a' : 'section';
    const href = tag === 'a' ? ` href="${escapeHtml(this.href)}"` : '';
    const target = tag === 'a' && this.target ? ` target="${escapeHtml(this.target)}"` : '';
    const rel = tag === 'a' && this.rel ? ` rel="${escapeHtml(this.rel)}"` : '';
    const role = tag === 'section' && this.interactive ? ' role="button"' : '';
    const tabIndex = this.interactive ? ` tabindex="${this.disabled ? '-1' : '0'}"` : '';
    const ariaPressed = this.selectable ? ` aria-pressed="${this.selected ? 'true' : 'false'}"` : '';
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = (
  this.surfaceStyles(`.uib-card{width:100%;font:inherit}.uib-card--interactive{cursor:pointer}.uib-card--selected{border-color:var(--uib-color-primary,#174a8b);box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.18))}.uib-card__media{display:block;overflow:hidden;background:var(--uib-color-surface-soft,#f8fbff)}.uib-card__media::slotted(img),.uib-card__media::slotted(video),.uib-card__media::slotted(uib-media){display:block;width:100%}`) +
  `<${tag} class="${this.surfaceClasses(this.interactive ? 'uib-card--interactive' : '', this.selected ? 'uib-card--selected' : '')}" part="base" ` +
  (this.ariaLabel ? `aria-label="${escapeHtml(this.ariaLabel)}"` : (headingId ? `aria-labelledby="${headingId}"` : '')) +
  (this.ariaDescribedBy ? ` aria-describedby="${escapeHtml(this.ariaDescribedBy)}"` : '') +
  (this.disabled ? ' aria-disabled="true"' : '') +
  ariaPressed +
  role +
  href +
  target +
  rel +
  tabIndex +
  `>` +
  `<div class="uib-card__media" part="media"` +
  (hasMedia ? '' : ' hidden') +
  `><slot name="media"></slot></div>` +
  this.headerMarkup(headingId, hasHeader) +
  this.bodyMarkup() +
  this.footerMarkup(hasFooter) +
  `</${tag}>`
);
    const surface = this.shadowRoot.querySelector('.uib-card');
    surface?.addEventListener('click', (event) => this.activate(event));
    surface?.addEventListener('keydown', (event) => this.handleKeydown(event));
    if (hadSurfaceFocus && this.interactive && !this.disabled) surface?.focus({ preventScroll: true });
  }
}

export class UibDialog extends UibLayoutBase {
  static get observedAttributes() { return [...UibBaseElement.commonAttributes, 'open', 'heading']; }
  get open() { return this.hasAttribute('open'); }
  set open(value) { this.toggleAttribute('open', Boolean(value)); }
  show() { this.open = true; }
  close() { const oldValue = true; this.open = false; this.emitValueChange('uib-dialog-close', oldValue, false); }
  render() {
    const heading = this.label || this.getAttribute('heading') || 'Dialog';
    const headingId = `${this.componentId}-heading`;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = (
  `<style>` +
  ` ` +
  (baseStyles) +
  `:host{display:` +
  (this.open ? 'block' : 'none') +
  `}.uib-dialog{position:fixed;inset:0;z-index:var(--uib-z-index-modal,1100);display:grid;place-items:center;padding:1rem;background:rgba(6,21,40,.48)}.uib-dialog__panel{width:min(42rem,100%);max-height:calc(100vh - 2rem);overflow:auto;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);box-shadow:var(--uib-shadow-lg,0 24px 70px rgba(10,31,68,.14))}.uib-dialog__header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem;border-bottom:1px solid var(--uib-color-border,#d9e2f0);font-weight:850}.uib-dialog__body{padding:1rem}.uib-dialog__footer{padding:1rem;border-top:1px solid var(--uib-color-border,#d9e2f0);background:var(--uib-color-surface-soft,#f8fbff)}button{border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-pill,999px);background:var(--uib-color-surface,#fff);padding:.45rem .65rem;cursor:pointer} ` +
  `</style>` +
  `<div class="uib-dialog" part="backdrop">` +
  `<section class="uib-dialog__panel" part="panel" role="dialog" aria-modal="true" aria-labelledby="` +
  (headingId) +
  `">` +
  `<div class="uib-dialog__header" part="header">` +
  `<span id="` +
  (headingId) +
  `">` +
  `<slot name="header">` +
  (escapeHtml(heading)) +
  `</slot>` +
  `</span>` +
  `<button type="button" part="close-button" aria-label="Close">` +
  `<uib-icon name="close" decorative>` +
  `</uib-icon>` +
  `</button>` +
  `</div>` +
  `<div class="uib-dialog__body" part="body">` +
  `<slot>` +
  `</slot>` +
  `</div>` +
  `<div class="uib-dialog__footer" part="footer">` +
  `<slot name="footer">` +
  `</slot>` +
  `</div>` +
  `</section>` +
  `</div>`
);
    this.shadowRoot.querySelector('button')?.addEventListener('click', () => this.close());
    this.shadowRoot.querySelector('.uib-dialog')?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) this.close();
    });
  }
}

export class UibAccordion extends UibLayoutBase {
  static get observedAttributes() { return [...UibBaseElement.commonAttributes, 'open', 'heading']; }
  render() {
    const heading = this.label || this.getAttribute('heading') || 'Accordion';
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = (
  `<style>` +
  ` ` +
  (baseStyles) +
  `details{border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);overflow:hidden}summary{cursor:pointer;padding:1rem;font-weight:850}summary:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}.uib-accordion__body{padding:0 1rem 1rem} ` +
  `</style>` +
  `<details part="base" ` +
  (this.hasAttribute('open') ? 'open' : '') +
  `>` +
  `<summary part="summary">` +
  `<slot name="summary">` +
  (escapeHtml(heading)) +
  `</slot>` +
  `</summary>` +
  `<div class="uib-accordion__body" part="body">` +
  `<slot>` +
  `</slot>` +
  `</div>` +
  `</details>`
);
    this.shadowRoot.querySelector('details')?.addEventListener('toggle', (event) => {
      const open = event.currentTarget.open;
      this.toggleAttribute('open', open);
      this.emitMtEvent('uib-accordion-toggle', { name: this.name, oldValue: !open, newValue: open });
    });
  }
}

export class UibTab extends UibLayoutBase {
  static get observedAttributes() { return [...UibBaseElement.commonAttributes, 'selected', 'aria-selected', 'aria-disabled']; }
  get disabled() { return this.hasAttribute('disabled') || this.getAttribute('aria-disabled') === 'true'; }
  set disabled(value) { this.toggleAttribute('disabled', Boolean(value)); }
  render() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = (
  `<style>` +
  ` ` +
  (baseStyles) +
  `:host{display:inline-flex;align-items:center;justify-content:center;min-height:2.3rem;min-width:2.75rem;padding:.55rem .78rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-pill,999px);background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);font:inherit;font-weight:850;line-height:1.2;cursor:pointer;user-select:none;outline:none}:host(:focus-visible){box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}:host([selected]),:host([aria-selected="true"]){border-color:var(--uib-color-primary,#174a8b);background:var(--uib-color-primary,#174a8b);color:var(--uib-color-primary-contrast,#fff)}:host([disabled]),:host([aria-disabled="true"]){cursor:not-allowed;opacity:.58}::slotted(*){pointer-events:none} ` +
  `</style>` +
  `<slot>` +
  `</slot>`
);
  }
}

export class UibTabPanel extends UibLayoutBase {
  static get observedAttributes() { return [...UibBaseElement.commonAttributes, 'selected']; }
  render() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = (
  `<style>` +
  ` ` +
  (baseStyles) +
  `:host{display:block;padding:1rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff)}:host([hidden]){display:none!important} ` +
  `</style>` +
  `<slot>` +
  `</slot>`
);
  }
}

export class UibTabs extends UibLayoutBase {
  static get observedAttributes() { return [...UibBaseElement.commonAttributes, 'selected', 'orientation']; }
  constructor() {
    super();
    this._reflectingSelected = false;
    this._pendingSelected = null;
    this._syncing = false;
    this._observer = null;
    this._boundClick = (event) => this._handleClick(event);
    this._boundKeydown = (event) => this._handleKeydown(event);
  }
  get selected() { return this.getAttribute('selected') || ''; }
  set selected(value) {
    if (value === null || value === undefined || value === '') this.removeAttribute('selected');
    else this.setAttribute('selected', String(value));
  }
  get orientation() {
    return this.getAttribute('orientation') === 'vertical' ? 'vertical' : 'horizontal';
  }
  set orientation(value) {
    if (value === 'vertical') this.setAttribute('orientation', 'vertical');
    else this.setAttribute('orientation', 'horizontal');
  }
  connectedCallback() {
    this.render();
    this._connectObserver();
    this._syncTabs({ emit: false });
  }
  disconnectedCallback() {
    this._observer?.disconnect();
    this._observer = null;
    this.removeEventListener('click', this._boundClick);
    this.removeEventListener('keydown', this._boundKeydown);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'selected' && !this._reflectingSelected) this._pendingSelected = newValue;
    if (this.isConnected) {
      this.render();
      this._syncTabs({ emit: false });
    }
  }
  render() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = (
  `<style>` +
  ` ` +
  (baseStyles) +
  `:host{display:block}.uib-tabs{display:grid;gap:.75rem}.uib-tabs--vertical{grid-template-columns:max-content minmax(0,1fr);align-items:start}.uib-tabs__list{display:flex;gap:.35rem;flex-wrap:wrap}.uib-tabs--vertical .uib-tabs__list{flex-direction:column;align-items:stretch}.uib-tabs__panels{min-width:0}@media(max-width:640px){.uib-tabs--vertical{grid-template-columns:1fr}.uib-tabs--vertical .uib-tabs__list{flex-direction:row;align-items:center}} ` +
  `</style>` +
  `<div class="uib-tabs uib-tabs--` +
  (escapeHtml(this.orientation)) +
  `" part="base">` +
  `<div class="uib-tabs__list" part="tablist" role="tablist" aria-orientation="` +
  (escapeHtml(this.orientation)) +
  `">` +
  `<slot name="tab">` +
  `</slot>` +
  `</div>` +
  `<div class="uib-tabs__panels" part="panels">` +
  `<slot name="panel">` +
  `</slot>` +
  `</div>` +
  `</div>`
);
    this.removeEventListener('click', this._boundClick);
    this.removeEventListener('keydown', this._boundKeydown);
    this.addEventListener('click', this._boundClick);
    this.addEventListener('keydown', this._boundKeydown);
  }
  _connectObserver() {
    this._observer?.disconnect();
    this._observer = new MutationObserver(() => this._syncTabs({ emit: false }));
    this._observer.observe(this, {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['disabled', 'aria-disabled']
    });
  }
  _tabs() {
    return Array.from(this.children).filter((child) => child.localName === 'uib-tab');
  }
  _panels() {
    return Array.from(this.children).filter((child) => child.localName === 'uib-tab-panel');
  }
  _isDisabled(tab) {
    return tab.hasAttribute('disabled') || tab.getAttribute('aria-disabled') === 'true';
  }
  _setManagedAttribute(element, name, value) {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }
  _parseSelected() {
    const value = this._pendingSelected ?? this.getAttribute('selected');
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  }
  _firstEnabledIndex(tabs) {
    return tabs.findIndex((tab) => !this._isDisabled(tab));
  }
  _lastEnabledIndex(tabs) {
    for (let index = tabs.length - 1; index >= 0; index -= 1) {
      if (!this._isDisabled(tabs[index])) return index;
    }
    return -1;
  }
  _normalizeSelected(tabs) {
    const requested = this._parseSelected();
    if (requested !== null && tabs[requested] && !this._isDisabled(tabs[requested])) return requested;
    return this._firstEnabledIndex(tabs);
  }
  _reflectSelected(index) {
    this._reflectingSelected = true;
    if (index >= 0) this.setAttribute('selected', String(index));
    else this.removeAttribute('selected');
    this._reflectingSelected = false;
    this._pendingSelected = null;
  }
  _syncTabs({ emit = false, oldValue = null } = {}) {
    if (this._syncing) return;
    this._syncing = true;
    const tabs = this._tabs();
    const panels = this._panels();
    const selectedIndex = this._normalizeSelected(tabs);

    tabs.forEach((tab, index) => {
      const selected = index === selectedIndex;
      const disabled = this._isDisabled(tab);
      const panel = panels[index];
      const tabId = tab.id || `${this.componentId}-tab-${index}`;
      const panelId = panel?.id || `${this.componentId}-panel-${index}`;
      if (!tab.id) tab.id = tabId;
      tab.slot = 'tab';
      this._setManagedAttribute(tab, 'role', 'tab');
      this._setManagedAttribute(tab, 'aria-selected', selected ? 'true' : 'false');
      this._setManagedAttribute(tab, 'aria-disabled', disabled ? 'true' : 'false');
      if (panel) this._setManagedAttribute(tab, 'aria-controls', panelId);
      else tab.removeAttribute('aria-controls');
      tab.toggleAttribute('selected', selected);
      tab.tabIndex = selected || (selectedIndex < 0 && index === 0) ? 0 : -1;
    });

    panels.forEach((panel, index) => {
      const selected = index === selectedIndex;
      const tab = tabs[index];
      const tabId = tab?.id || `${this.componentId}-tab-${index}`;
      const panelId = panel.id || `${this.componentId}-panel-${index}`;
      if (!panel.id) panel.id = panelId;
      panel.slot = 'panel';
      this._setManagedAttribute(panel, 'role', 'tabpanel');
      if (tab) this._setManagedAttribute(panel, 'aria-labelledby', tabId);
      else panel.removeAttribute('aria-labelledby');
      panel.toggleAttribute('hidden', !selected);
      panel.toggleAttribute('selected', selected);
      panel.tabIndex = selected ? 0 : -1;
    });

    this._reflectSelected(selectedIndex);
    this._syncing = false;

    const newValue = selectedIndex >= 0 ? selectedIndex : null;
    if (emit && oldValue !== newValue) this.emitValueChange('uib-tabs-change', oldValue, newValue);
  }
  _selectIndex(index, { emit = true, focus = true } = {}) {
    const tabs = this._tabs();
    if (!tabs[index] || this._isDisabled(tabs[index])) {
      if (focus && tabs[index]) tabs[index].focus();
      return;
    }
    const oldValue = this._normalizeSelected(tabs);
    this._pendingSelected = String(index);
    this._syncTabs({ emit, oldValue: oldValue >= 0 ? oldValue : null });
    if (focus) tabs[index]?.focus();
  }
  _handleClick(event) {
    const tab = event.target.closest?.('uib-tab');
    if (!tab || tab.parentElement !== this) return;
    const index = this._tabs().indexOf(tab);
    this._selectIndex(index, { emit: true, focus: true });
  }
  _handleKeydown(event) {
    const currentTab = event.target.closest?.('uib-tab');
    if (!currentTab || currentTab.parentElement !== this) return;
    const tabs = this._tabs();
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex < 0) return;
    const nextKey = this.orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
    const previousKey = this.orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';

    if (event.key === nextKey || event.key === previousKey) {
      event.preventDefault();
      const direction = event.key === nextKey ? 1 : -1;
      const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
      tabs[nextIndex]?.focus();
      if (!this._isDisabled(tabs[nextIndex])) this._selectIndex(nextIndex, { emit: true, focus: false });
    } else if (event.key === 'Home') {
      event.preventDefault();
      this._selectIndex(this._firstEnabledIndex(tabs), { emit: true, focus: true });
    } else if (event.key === 'End') {
      event.preventDefault();
      this._selectIndex(this._lastEnabledIndex(tabs), { emit: true, focus: true });
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._selectIndex(currentIndex, { emit: true, focus: true });
    }
  }
}

export class UibSplitter extends UibLayoutBase {
  static get observedAttributes() { return [...UibBaseElement.commonAttributes, 'position']; }
  render() {
    const position = this.getAttribute('position') || '1fr 1fr';
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = (
  `<style>` +
  ` ` +
  (baseStyles) +
  `.uib-splitter{display:grid;grid-template-columns:` +
  (escapeHtml(position)) +
  `;gap:var(--uib-space-4,1rem)}.uib-splitter__pane{min-width:0;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);padding:1rem}@media(max-width:700px){.uib-splitter{grid-template-columns:1fr}} ` +
  `</style>` +
  `<div class="uib-splitter" part="base">` +
  `<section class="uib-splitter__pane" part="pane-start">` +
  `<slot name="start">` +
  `</slot>` +
  `</section>` +
  `<section class="uib-splitter__pane" part="pane-end">` +
  `<slot name="end">` +
  `</slot>` +
  `<slot>` +
  `</slot>` +
  `</section>` +
  `</div>`
);
  }
}

defineUiBaseElement('uib-stack', UibStack);
defineUiBaseElement('uib-grid', UibGrid);
defineUiBaseElement('uib-row', UibRow);
defineUiBaseElement('uib-column', UibColumn);
defineUiBaseElement('uib-panel', UibPanel);
defineUiBaseElement('uib-card', UibCard);
defineUiBaseElement('uib-dialog', UibDialog);
defineUiBaseElement('uib-accordion', UibAccordion);
defineUiBaseElement('uib-tab', UibTab);
defineUiBaseElement('uib-tab-panel', UibTabPanel);
defineUiBaseElement('uib-tabs', UibTabs);
defineUiBaseElement('uib-splitter', UibSplitter);
