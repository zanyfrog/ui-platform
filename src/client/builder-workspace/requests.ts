import { createEditorSessionBinding, refreshEditorSession } from '../artifact-editor/session.js';
import type { AuthorizedWorkspaceArtifact, WorkspaceTarget } from '../../shared/builder-workspace.js';

export async function workspaceRequest<T>(applicationKey: string, action = '', target?: WorkspaceTarget): Promise<T> {
  await refreshEditorSession();
  const binding = createEditorSessionBinding(), headers = await binding.headers();
  const response = await fetch(`/api/apps/${encodeURIComponent(applicationKey)}/builder-workspace${action}`, {
    method: target ? 'POST' : 'GET', cache: 'no-store', headers: { ...headers, 'content-type': 'application/json' },
    ...(target ? { body: JSON.stringify(target) } : {}),
  });
  const result = await response.json(); binding.assert();
  if (!response.ok) throw new Error(result.error ?? 'Workspace access denied.');
  return result;
}
export const authorizeWorkspace = (key: string, target: WorkspaceTarget) => workspaceRequest<AuthorizedWorkspaceArtifact>(key, '/authorize', target);
