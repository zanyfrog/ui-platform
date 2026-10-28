let idCounter = 0;

export const TRUE_VALUES = new Set(['true', '1', 'yes', 'y', 'on', 'checked']);
export const FALSE_VALUES = new Set(['false', '0', 'no', 'n', 'off', 'unchecked']);
export const NULL_VALUES = new Set(['', 'null', 'undefined', 'na', 'n/a', 'none']);

export function createId(prefix = 'mt') {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function normalizeAttributeValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function parseBoolean(value, defaultValue = false) {
  if (value === true || value === false) return value;
  if (value === null || value === undefined) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return defaultValue;
}

export function parseNullableBoolean(value) {
  if (value === true || value === false || value === null) return value;
  if (value === undefined) return null;
  const normalized = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  if (NULL_VALUES.has(normalized)) return null;
  return null;
}

export function normalizeNullableBoolean(value, required = false) {
  const parsed = parseNullableBoolean(value);
  return required && parsed === null ? false : parsed;
}

export function nullableBooleanToAttribute(value) {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return 'null';
}

export function booleanToAttribute(value) {
  return parseBoolean(value) ? 'true' : 'false';
}

export function splitCommaList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getDirectTextContent(element) {
  if (!element) return '';
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent.trim())
    .filter(Boolean)
    .join(' ');
}

export function defineUiBaseElement(tagName, elementClass) {
  installCssClassProperty(elementClass);
  if (!customElements.get(tagName)) customElements.define(tagName, elementClass);
  return elementClass;
}

export function cssClassTokens(element) {
  return String(element?.getAttribute?.('css-class') ?? element?.cssClass ?? '')
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function classNames(...values) {
  return values
    .flatMap((value) => String(value ?? '').split(/\s+/))
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(' ');
}

export function cssClassNames(element, ...baseClasses) {
  return classNames(...baseClasses, ...cssClassTokens(element));
}

export function applyCssClassToShadowRoot(element) {
  if (!element) return;
  const root = element.shadowRoot || element;
  const target = root.querySelector('[data-uib-css-class-root]')
    || Array.from(root.children).find((child) => child instanceof HTMLElement && child.localName !== 'style');
  if (!target) return;
  const previous = element.__uibCssClassTokens || [];
  target.classList.remove(...previous);
  const next = cssClassTokens(element);
  if (next.length) target.classList.add(...next);
  element.__uibCssClassTokens = next;
}

export function installCssClassProperty(elementClass) {
  const prototype = elementClass?.prototype;
  if (!prototype) return elementClass;

  if (!Object.getOwnPropertyDescriptor(prototype, 'cssClass')) {
    Object.defineProperty(prototype, 'cssClass', {
      configurable: true,
      enumerable: true,
      get() { return this.getAttribute('css-class') || ''; },
      set(value) { setOrRemoveAttribute(this, 'css-class', value); }
    });
  }

  const observed = Array.isArray(elementClass.observedAttributes) ? elementClass.observedAttributes : [];
  if (!observed.includes('css-class')) {
    Object.defineProperty(elementClass, 'observedAttributes', {
      configurable: true,
      value: [...observed, 'css-class']
    });
  }

  if (typeof prototype.render === 'function' && !prototype.__uibCssClassRenderWrapped) {
    const render = prototype.render;
    prototype.render = function renderWithCssClass(...args) {
      const result = render.apply(this, args);
      applyCssClassToShadowRoot(this);
      return result;
    };
    prototype.__uibCssClassRenderWrapped = true;
  }

  return elementClass;
}

export function ensureGlobalStyle(id, cssText) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = cssText;
  document.head.append(style);
}

export function readCssLengthPx(value, fallback = 768) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  const numeric = Number.parseFloat(raw);
  if (!Number.isFinite(numeric)) return fallback;
  if (raw.endsWith('rem')) {
    const rootFontSize = typeof window === 'undefined'
      ? 16
      : Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
    return numeric * rootFontSize;
  }
  if (raw.endsWith('em')) {
    const bodyFontSize = typeof window === 'undefined'
      ? 16
      : Number.parseFloat(window.getComputedStyle(document.body).fontSize) || 16;
    return numeric * bodyFontSize;
  }
  return numeric;
}

export function attributeBoolean(element, name) {
  return element.hasAttribute(name);
}

export function setOrRemoveAttribute(element, name, value) {
  if (value === null || value === undefined || value === false) {
    element.removeAttribute(name);
    return;
  }
  if (value === true) {
    element.setAttribute(name, '');
    return;
  }
  element.setAttribute(name, String(value));
}

export function mergeIds(...ids) {
  return ids
    .flatMap((value) => String(value ?? '').split(/\s+/))
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(' ');
}
