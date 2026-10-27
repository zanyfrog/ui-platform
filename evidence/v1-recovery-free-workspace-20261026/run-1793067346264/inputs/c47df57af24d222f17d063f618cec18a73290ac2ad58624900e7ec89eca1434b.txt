// The broad Vite barrel is excluded; actual Foundation forwarding executes.
export { withRuntimeGraphRead } from '../../packages/visual-artifacts/src/runtime-read-admission.js';
export function assertIsolatedPreviewFunctions(_code: string): void { throw new Error('PREVIEW_COMPILER_UNADMITTED'); }
