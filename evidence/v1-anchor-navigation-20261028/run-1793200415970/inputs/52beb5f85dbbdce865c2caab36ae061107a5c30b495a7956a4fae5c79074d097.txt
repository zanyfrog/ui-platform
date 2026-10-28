import { createId, mergeIds, setOrRemoveAttribute } from './utils.js';

export class UibBaseElement extends HTMLElement {
  static commonAttributes = [
    'name',
    'label',
    'help',
    'help-mode',
    'title',
    'disabled',
    'readonly',
    'required',
    'hidden',
    'invalid',
    'error',
    'css-class',
    'aria-label',
    'aria-describedby'
  ];

  constructor() {
    super();
    this._uibId = createId(this.localName || 'uib-component');
  }

  get componentId() {
    return this.id || this._uibId;
  }

  get name() {
    return this.getAttribute('name') || '';
  }

  set name(value) {
    setOrRemoveAttribute(this, 'name', value);
  }

  get label() {
    return this.getAttribute('label') || '';
  }

  set label(value) {
    setOrRemoveAttribute(this, 'label', value);
  }

  get help() {
    return this.getAttribute('help') || '';
  }

  set help(value) {
    setOrRemoveAttribute(this, 'help', value);
  }

  get helpMode() {
    const mode = (this.getAttribute('help-mode') || '').toLowerCase();
    return mode === 'inline' ? 'inline' : 'tooltip';
  }

  set helpMode(value) {
    setOrRemoveAttribute(this, 'help-mode', value);
  }

  get titleText() {
    return this.getAttribute('title') || '';
  }

  set titleText(value) {
    setOrRemoveAttribute(this, 'title', value);
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(value) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  get readonly() {
    return this.hasAttribute('readonly');
  }

  set readonly(value) {
    this.toggleAttribute('readonly', Boolean(value));
  }

  get required() {
    return this.hasAttribute('required');
  }

  set required(value) {
    this.toggleAttribute('required', Boolean(value));
  }

  get invalid() {
    return this.hasAttribute('invalid');
  }

  set invalid(value) {
    this.toggleAttribute('invalid', Boolean(value));
  }

  get error() {
    return this.getAttribute('error') || '';
  }

  set error(value) {
    setOrRemoveAttribute(this, 'error', value);
  }

  get ariaLabel() {
    return this.getAttribute('aria-label') || '';
  }

  get ariaDescribedBy() {
    return this.getAttribute('aria-describedby') || '';
  }

  get cssClass() {
    return this.getAttribute('css-class') || '';
  }

  set cssClass(value) {
    setOrRemoveAttribute(this, 'css-class', value);
  }

  describedBy(...internalIds) {
    return mergeIds(this.ariaDescribedBy, ...internalIds);
  }

  emitMtEvent(type, detail = {}, options = {}) {
    this.dispatchEvent(new CustomEvent(type, {
      bubbles: options.bubbles ?? true,
      composed: options.composed ?? true,
      cancelable: options.cancelable ?? false,
      detail
    }));
  }

  emitValueChange(componentEventName, oldValue, newValue, extra = {}) {
    const detail = {
      name: this.name,
      oldValue,
      newValue,
      ...extra
    };
    this.emitMtEvent('change', detail);
    if (componentEventName) this.emitMtEvent(componentEventName, detail);
  }

  attributeChangedCallback() {
    if (this.isConnected && typeof this.render === 'function') this.render();
  }
}
