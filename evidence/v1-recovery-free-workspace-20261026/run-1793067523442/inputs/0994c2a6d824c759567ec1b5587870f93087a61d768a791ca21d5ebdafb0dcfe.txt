export * from '../d6-r1/fs-guard.js';
// Composition asset writes are outside these read tests.
export async function writeFile(..._args: unknown[]): Promise<never> { throw new Error('UNADMITTED_COMPOSITION_WRITE'); }
