declare module 'virtual:uip-visual-artifacts' {
  export const components: import('@ui-platform/visual-artifacts').RuntimeArtifact[];
  export const packages: import('@ui-platform/visual-artifacts').PackageComponent[];
}
declare module 'virtual:uip-visual-page' {
  export const page: import('@ui-platform/visual-artifacts').RuntimeArtifact;
  export const components: import('@ui-platform/visual-artifacts').RuntimeArtifact[];
  export const packages: import('@ui-platform/visual-artifacts').PackageComponent[];
  export const runtimeRevision: string;
  export const composition: import('@ui-platform/visual-artifacts').CompositionDefinition | undefined;
  export const assetUrls: Record<string, string>;
}
declare module 'virtual:uip-application-composition' {
  export const definition: import('@ui-platform/visual-artifacts').CompositionDefinition;
  export const platformComponents: import('@ui-platform/visual-artifacts').RuntimeArtifact[];
  export const packages: import('@ui-platform/visual-artifacts').PackageComponent[];
  export const runtimeRevision: string;
  export const assetUrls: Record<string, string>;
}
