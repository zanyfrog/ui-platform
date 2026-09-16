/**
 * Application-owned presentation contracts.  These artifacts deliberately
 * describe appearance only; pages and workflows continue to own behaviour.
 */
export const APPLICATION_PRESENTATION_VERSION = '1.0.0';

export interface PresentationAsset {
  id: string;
  name: string;
  type: 'logo' | 'image' | 'icon' | 'illustration' | 'background' | 'favicon' | 'other';
  path: string;
  alt?: string;
  active: boolean;
}

export type PresentationShell = 'public' | 'authenticated' | 'minimal';
export type PresentationTemplate = 'standard' | 'two-column' | 'dashboard' | 'form' | 'detail-record';

export interface PresentationShellSettings {
  logoAssetId?: string;
  showNavigation: boolean;
  navigationPlacement: 'top' | 'side';
  showFooter: boolean;
  footerText: string;
}

export interface PresentationNavigationItem {
  route: string;
  label?: string;
  icon?: string;
  visible?: boolean;
  order?: number;
}

export interface PresentationHero {
  id: string;
  enabled: boolean;
  variant: 'standard' | 'compact' | 'image-background';
  data: Record<string, unknown>;
}

export interface ApplicationPresentationLayout {
  defaultShell: PresentationShell;
  defaultTemplate: PresentationTemplate;
  routes: Record<string, { shell?: PresentationShell; template?: PresentationTemplate; heroId?: string }>;
  shells: Record<PresentationShell, PresentationShellSettings>;
  navigation: PresentationNavigationItem[];
}

export interface ApplicationPresentation {
  schemaVersion: typeof APPLICATION_PRESENTATION_VERSION;
  name: string;
  tokens: Record<string, string>;
  typography: Record<string, string>;
  /** Values are accepted only for component settings advertised by UI Base metadata. */
  componentDefaults: Record<string, Record<string, string | number | boolean>>;
  layout: ApplicationPresentationLayout;
  heroes: Record<string, PresentationHero>;
  css: string;
  assets: PresentationAsset[];
}

export interface PresentationVersionInfo {
  version: number;
  checksum: string;
  publishedAt: string;
  actor: string;
}

export interface ApplicationPresentationManifest {
  type: 'ui-platform.presentation';
  schemaVersion: typeof APPLICATION_PRESENTATION_VERSION;
  applicationId: string;
  activeVersion: number | null;
  draft: { exists: boolean; modifiedAt?: string; checksum?: string };
  versions: PresentationVersionInfo[];
}

export interface ApplicationPresentationStatus {
  initialized: boolean;
  manifest: ApplicationPresentationManifest | null;
  draft: ApplicationPresentation | null;
  draftDiffersFromActive: boolean;
}
