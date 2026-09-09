/**
 * Purpose: Protects platform URL routes from accidental application discovery or creation.
 * Use: Add any new platform root route to the reserved-key list and extend these checks.
 */

import { describe, expect, it } from 'vitest';
import { appPath } from '../src/server/applications.js';

describe('application URL keys', () => {
  it('rejects reserved platform routes', () => {
    expect(() => appPath('packages')).toThrow('reserved for a platform route');
    expect(() => appPath('api')).toThrow('reserved for a platform route');
  });

  it('continues to allow regular application keys', () => {
    expect(appPath('my-test-app')).toMatch(/my-test-app$/);
  });
});
