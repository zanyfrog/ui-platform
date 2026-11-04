declare module '@ui-base/ui/component-reference' {
  export function renderComponentInstance(definition: unknown, instance: unknown, options?: unknown): HTMLElement;
  export class ComponentRegistry { registerManifest(manifest: unknown, options: unknown): unknown; registerHandler(id: string, handler: (...args: any[]) => unknown): void; }
}
