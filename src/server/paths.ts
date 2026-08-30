import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const platformRoot = path.resolve(here, '..', '..');
export const modularRoot = path.resolve(platformRoot, '..');
export const appsDir = path.resolve(process.env.UI_APPS_DIR ?? path.join(modularRoot, 'apps'));
export const templatesDir = path.resolve(process.env.UI_TEMPLATES_DIR ?? path.join(modularRoot, 'templates'));
export const runtimeDir = path.resolve(process.env.UI_RUNTIME_DIR ?? path.join(modularRoot, '.ui'));
export const uiBasePackagesDir = path.join(modularRoot, 'ui-base', 'packages');
export const ormDir = path.join(modularRoot, 'orm');
