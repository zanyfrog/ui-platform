const icons = new Map();

export function registerMtIcon(name, svg) {
  const normalized = String(name || '').trim().toLowerCase();
  if (!normalized) throw new Error('Icon name is required.');
  icons.set(normalized, String(svg || ''));
}

export function getMtIcon(name) {
  return icons.get(String(name || '').trim().toLowerCase()) || '';
}

export function hasMtIcon(name) {
  return icons.has(String(name || '').trim().toLowerCase());
}

export function listMtIcons() {
  return Array.from(icons.keys()).sort();
}

registerMtIcon('help', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 17a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Zm1.1-5.1v.6h-2.1v-.8c0-1.4.8-2.1 1.6-2.7.7-.5 1.2-.9 1.2-1.7 0-.9-.7-1.5-1.8-1.5-1 0-1.7.5-2.3 1.3L8.2 7.9A4.4 4.4 0 0 1 12.1 6c2.4 0 4 1.4 4 3.3 0 1.8-1.1 2.6-2 3.2-.6.5-1 .8-1 1.4Z" fill="currentColor"/></svg>');
registerMtIcon('info', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 10h2v8h-2v-8Zm0-4h2v2h-2V6Zm1-4a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" fill="currentColor"/></svg>');
registerMtIcon('menu', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v2H4v-2Zm0 4.5h16v2H4v-2Zm0 4.5h16v2H4v-2Z" fill="currentColor"/></svg>');
registerMtIcon('close', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5Zm12.6 1.4L6.4 19 5 17.6 17.6 5 19 6.4Z" fill="currentColor"/></svg>');
registerMtIcon('chevron-down', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7.4 8.6 4.6 4.6 4.6-4.6L18 10l-6 6-6-6 1.4-1.4Z" fill="currentColor"/></svg>');
registerMtIcon('check', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.2 16.6-4.1-4.1-1.4 1.4 5.5 5.5L20.3 8.3l-1.4-1.4-9.7 9.7Z" fill="currentColor"/></svg>');
registerMtIcon('x', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5Zm12.6 1.4L6.4 19 5 17.6 17.6 5 19 6.4Z" fill="currentColor"/></svg>');
registerMtIcon('calendar', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v3h6V2h2v3h3v17H4V5h3V2Zm13 8H6v10h14V10ZM6 8h14V7H6v1Z" fill="currentColor"/></svg>');
registerMtIcon('warning', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 1.8 21h20.4L12 3Zm1 15h-2v-2h2v2Zm0-4h-2V9h2v5Z" fill="currentColor"/></svg>');
registerMtIcon('external-link', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3ZM5 5h6v2H7v10h10v-4h2v6H5V5Z" fill="currentColor"/></svg>');
