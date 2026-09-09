/**
 * Purpose: Verifies source-kind detection for the unified package acquisition endpoint.
 * Use: Add supported URL shapes here before extending the dispatcher.
 */

import { describe, expect, it } from 'vitest';
import { classifyPackageSource } from '../src/server/package-acquisition.js';

describe('package source classification', () => {
  it('recognizes GitHub foundation workspace URLs', () => {
    expect(classifyPackageSource('git@github.com:zanyfrog/ui-base.git')).toBe('github');
    expect(classifyPackageSource('https://github.com/zanyfrog/ui-base')).toBe('github');
  });

  it('recognizes npm URLs and specifiers', () => {
    expect(classifyPackageSource('https://www.npmjs.com/package/@uib/calendar/v/1.0.0')).toBe('npm');
    expect(classifyPackageSource('npm:@uib/calendar@1.0.0')).toBe('npm');
  });

  it('does not guess unrecognized sources', () => {
    expect(classifyPackageSource('https://example.invalid/package')).toBe('unknown');
  });
});
