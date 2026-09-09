export type AppStatus = 'active' | 'disabled';

export interface TemplateSettingDefinition {
  path: string;
  label: string;
  type: 'text' | 'multiline' | 'boolean' | 'select' | 'email' | 'url' | 'number';
  group?: string;
  required?: boolean;
  options?: string[];
  help?: string;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  requiredCreationFields: Array<{ key: 'APP_NAME' | 'APP_KEY'; label: string; type: 'text' | 'slug'; required: true }>;
  settings: TemplateSettingDefinition[];
  defaultPackages: string[];
}

export interface DiscoveredApp {
  key: string;
  name: string;
  appId: string;
  status: AppStatus;
  template: string;
  templateVersion: string;
  valid: boolean;
  issues: string[];
  pages: string[];
  settings: Record<string, unknown>;
  appServices?: {
    package: string;
    components?: {
      appInfo?: {
        tag: string;
        bundle: string;
      };
    };
  } | null;
}

export type BuilderSupport = 'supported' | 'partial' | 'code-managed';

export interface BuilderTreeNode {
  id: string;
  kind: 'site' | 'folder' | 'page' | 'component' | 'element' | 'unknown';
  label: string;
  children?: BuilderTreeNode[];
  route?: string;
  source?: string;
  format?: 'typescript' | 'tsx';
  support?: BuilderSupport;
  expanded?: boolean;
}

export interface PageDescriptor {
  id: string;
  source: string;
  route: string;
  label: string;
  title?: string;
  format: 'typescript' | 'tsx';
  support: BuilderSupport;
  hash: string;
}

export interface PageTreePayload {
  tree: BuilderTreeNode;
  pages: PageDescriptor[];
}

export interface PageSourcePayload {
  page: PageDescriptor;
  source: string;
  structure: BuilderTreeNode;
}

export interface ComponentManifestEntry {
  id?: string;
  tagName: string;
  name?: string;
  category?: string;
  description?: string;
  module?: string;
  importPath?: string;
  attributes?: string[];
  properties?: string[];
  events?: string[];
  slots?: string[];
}

export interface ComponentCatalogEntry extends ComponentManifestEntry {
  id: string;
  packageName: string;
  packageVersion: string;
  source: string;
  metadataStatus: 'manifest' | 'package-metadata' | 'exports';
  moduleUrl?: string;
  activationIssues?: string[];
}

export type AppPackageResolution = 'app-first' | 'app-only' | 'platform-first' | 'platform-only';

export interface AppPackageDeclaration {
  enabled: boolean;
  version?: string;
  resolution?: AppPackageResolution;
  addedAt?: string;
  updatedAt?: string;
}

export interface AppFoundationImport {
  sourceId: string;
  repository: string;
  commit: string;
  selectedPackages: string[];
  resolvedPackages: string[];
  addedAt: string;
  updatedAt: string;
}

export interface AppManifest {
  manifestVersion: '1.0.0';
  appId: string;
  template: string;
  templateVersion: string;
  createdAt?: string;
  updatedAt?: string;
  packages: Record<string, AppPackageDeclaration>;
  foundationImports: Record<string, AppFoundationImport>;
}

export type PackageListSourceType = 'app-packages' | 'app-node-modules' | 'platform-packages' | 'platform-node-modules';
export type PackageListStatus = 'available' | 'installed' | 'enabled' | 'disabled' | 'missing' | 'incompatible' | 'error';

export interface PackageManifestIssue {
  filePath: string;
  sourceType: string;
  packageRoot: string;
  issues: string[];
}

export interface PackageListEntry {
  name: string;
  displayName: string;
  version: string;
  description?: string;
  icon?: string;
  status: PackageListStatus;
  sourceType: PackageListSourceType;
  sourceLabel: string;
  manifestPath: string;
  packageRoot: string;
  capabilities: string[];
  requiresServices: Record<string, string>;
  components: ComponentManifestEntry[];
  firstDiscoveredAt?: string;
  addedAt?: string;
  lastDiscoveredAt?: string;
  issues: string[];
}

export interface PackageCatalogPayload {
  entries: PackageListEntry[];
  rejected: PackageManifestIssue[];
  stateFilePath: string;
}

export interface AppPackageListEntry extends PackageListEntry {
  appEnabled: boolean;
  declared: boolean;
  requestedVersion?: string;
  resolution: AppPackageResolution;
  resolved: boolean;
  globalAvailable: boolean;
  appLocalAvailable: boolean;
}

export interface AppPackageCatalogPayload {
  appManifest: AppManifest;
  entries: AppPackageListEntry[];
  rejected: PackageManifestIssue[];
}

export interface FoundationWorkspacePackage {
  name: string;
  version: string;
  packagePath: string;
  dependencies: string[];
}

export interface FoundationSource {
  id: string;
  kind: 'github';
  repository: string;
  commit: string;
  installedAt: string;
  workspacePath: string;
  packages: FoundationWorkspacePackage[];
  revisions?: Record<string, FoundationSourceRevision>;
}

export interface FoundationSourceRevision {
  commit: string;
  installedAt: string;
  workspacePath: string;
  packages: FoundationWorkspacePackage[];
}

export interface FoundationSourceUpdatePlan {
  id: string;
  sourceId: string;
  repository: string;
  fromCommit: string;
  toCommit: string;
  preparedAt: string;
  candidate: FoundationSourceRevision;
  addedPackages: string[];
  removedPackages: string[];
  changedPackages: string[];
  affectedApps: FoundationUpdateAffectedApp[];
}

export interface FoundationUpdateAffectedApp {
  appKey: string;
  directPackages: string[];
  status: 'ready' | 'blocked' | 'not-on-current-revision';
  issues: string[];
}

export interface FoundationMigrationResult {
  appKey: string;
  status: 'migrated' | 'blocked' | 'failed';
  issues: string[];
}

export interface FoundationSourcePayload {
  sources: FoundationSource[];
}

export interface FoundationPackageUsage {
  appKey: string;
  relationship: 'direct' | 'dependency' | 'legacy';
}

export interface UnifiedPackageCatalogEntry {
  kind: 'uib-extension' | 'foundation';
  name: string;
  displayName: string;
  version: string;
  description?: string;
  icon?: string;
  status: PackageListStatus;
  lifecycleLabel: string;
  sourceLabel: string;
  sourceId?: string;
  repository?: string;
  commit?: string;
  installedAt?: string;
  firstDiscoveredAt?: string;
  addedAt?: string;
  lastDiscoveredAt?: string;
  appUsage: FoundationPackageUsage[];
  details: string[];
}

export interface UnifiedPackageCatalogPayload {
  entries: UnifiedPackageCatalogEntry[];
  rejected: PackageManifestIssue[];
  foundationSources: FoundationSource[];
}

export interface AppFoundationDependencyResult {
  sourceId: string;
  packages: string[];
  requestedPackages: string[];
  transitivePackages: string[];
  installRequired: true;
}

export interface AppFoundationDependencyPayload {
  sourceId: string;
  fromSourcePackageNames: string[];
  existingPackageNames: string[];
  directPackageNames: string[];
  requiredPackageNames: string[];
  hasImportRecord: boolean;
}
