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
