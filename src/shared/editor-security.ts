/** UI hints only. Every operation is independently authorized on the server. */
export interface EditorPrincipal {
  subjectId: string;
  label: string;
  roleIds: string[];
  applicationKeys: string[];
  isDevelopmentFixture: boolean;
}
export interface EditorSessionDto {
  revision: string;
  csrfToken: string;
  principal: EditorPrincipal | null;
  fixtures: { id: string; label: string }[];
}
export type EditorOperation = 'discover' | 'read' | 'validate' | 'references' | 'edit';
