/**
 * Stable identifiers for the application-presentation service.  The platform
 * implementation owns persistence; UI Base and future editors depend only on
 * this versioned contract through ServiceRegistry.
 */
export const APPLICATION_PRESENTATION_SERVICE_KEY = 'application-presentation';
export const APPLICATION_PRESENTATION_SERVICE_VERSION = '1.0.0';

export interface ApplicationPresentationService<TStatus, TDraft> {
  get(applicationKey: string): Promise<TStatus>;
  initialize(applicationKey: string): Promise<TStatus>;
  saveDraft(applicationKey: string, draft: TDraft): Promise<TStatus>;
  publish(applicationKey: string): Promise<TStatus>;
  rollback(applicationKey: string, sourceVersion: number): Promise<TStatus>;
}
