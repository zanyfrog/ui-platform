import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { resolvePackageModulePath } from '../src/server/component-registry.js';

describe('component preview module resolution', () => {
  it('keeps package-relative modules inside the package root', () => {
    expect(resolvePackageModulePath('C:/packages/calendar', './dist/calendar.js')).toBe(path.resolve('C:/packages/calendar', './dist/calendar.js'));
  });

  it('rejects modules that escape the package root', () => {
    expect(() => resolvePackageModulePath('C:/packages/calendar', './../outside.js')).toThrow('inside its package root');
  });
});
