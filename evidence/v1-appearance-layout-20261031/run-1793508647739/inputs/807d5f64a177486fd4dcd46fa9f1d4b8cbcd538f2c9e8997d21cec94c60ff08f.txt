const defaultLocale = 'en';
let currentLocale = defaultLocale;

const messageCatalog = new Map([
  [defaultLocale, {
    'common.help': 'Help',
    'common.close': 'Close',
    'common.menu': 'Menu',
    'common.openMenu': 'Open menu',
    'common.closeMenu': 'Close menu',
    'common.required': 'Required',
    'common.invalid': 'Invalid',
    'toggle.null': 'N/A',
    'toggle.true': '✓',
    'toggle.false': '✕',
    'toggle.nullAria': 'Not applicable',
    'toggle.trueAria': 'Yes',
    'toggle.falseAria': 'No',
    'checkbox.defaultLabel': 'Checkbox',
    'form.submit': 'Submit',
    'form.next': 'Next',
    'form.previous': 'Previous'
  }]
]);

export function setUiBaseLocale(locale, messages = {}) {
  currentLocale = String(locale || defaultLocale);
  if (!messageCatalog.has(currentLocale)) messageCatalog.set(currentLocale, {});
  Object.assign(messageCatalog.get(currentLocale), messages);
  if (typeof document !== 'undefined') {
    document.documentElement.dispatchEvent(new CustomEvent('uib-locale-change', {
      bubbles: true,
      composed: true,
      detail: { locale: currentLocale }
    }));
  }
}

export function getUiBaseLocale() {
  return currentLocale;
}

export function registerUiBaseMessages(locale, messages = {}) {
  const normalizedLocale = String(locale || defaultLocale);
  if (!messageCatalog.has(normalizedLocale)) messageCatalog.set(normalizedLocale, {});
  Object.assign(messageCatalog.get(normalizedLocale), messages);
}

export function getUiBaseMessage(key, fallback = '', locale = currentLocale) {
  const normalizedKey = String(key || '');
  const preferred = messageCatalog.get(locale) || {};
  const defaults = messageCatalog.get(defaultLocale) || {};
  return preferred[normalizedKey] ?? defaults[normalizedKey] ?? fallback;
}

export function getUiBaseMessages(locale = currentLocale) {
  return {
    ...(messageCatalog.get(defaultLocale) || {}),
    ...(messageCatalog.get(locale) || {})
  };
}
