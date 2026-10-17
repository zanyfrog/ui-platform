import type { WorkspaceIdentity, WorkspaceTarget } from './builder-workspace.js';

/** Presentation envelope only. Native validators remain authoritative. */
export interface ApplicationDiagnostic {
  severity: 'error' | 'warning' | 'info'; code: string; message: string;
  subsystem: string; revision?: string; target?: WorkspaceTarget;
  location?: { file?: string; path?: string; line?: number; column?: number };
}
export interface ValidationDependency { from: WorkspaceIdentity; to: WorkspaceIdentity }
export interface ApplicationValidationReport {
  status: 'complete' | 'incomplete' | 'stale';
  diagnostics: ApplicationDiagnostic[];
  /** Workspace identity keys, not unqualified IDs or another artifact registry. */
  reachable: string[];
  blockers: ApplicationDiagnostic[];
  publishable: boolean;
}

export interface AutomationServiceCatalogEntry {
  id: string; transactional: boolean;
  /** Runtime registration does not itself establish an approved UI signature. */
  selection: 'contract-review-required';
}
