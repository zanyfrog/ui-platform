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
}
