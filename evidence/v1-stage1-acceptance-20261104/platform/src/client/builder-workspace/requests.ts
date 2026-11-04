import { createEditorSessionBinding, refreshEditorSession } from '../artifact-editor/session.js';
import type { AuthorizedWorkspaceArtifact, WorkspaceTarget } from '../../shared/builder-workspace.js';

export async function workspaceRequest<T>(applicationKey: string, action = '', target?: WorkspaceTarget): Promise<T> {
  await refreshEditorSession();
  const binding = createEditorSessionBinding(), headers = await binding.headers();
  for (let attempt = 0; ; attempt++) {
  binding.assert();
  const response = await fetch(`/api/apps/${encodeURIComponent(applicationKey)}/builder-workspace${action}`, {
    method: target ? 'POST' : 'GET', cache: 'no-store', headers: { ...headers, 'content-type': 'application/json' },
    ...(target ? { body: JSON.stringify(target) } : {}),
  });
  const result = await response.json(); binding.assert();
  // Discovery/focus are reads, including POST /authorize. Repeat only explicit pre-read busy admission.
  // Original session binding remains fixed; denial, corrupt locks and policy changes never retry.
  if (response.status === 503 && result.code === 'WORKSPACE_SOURCE_BUSY' && attempt < 19) {
    await new Promise(resolve => setTimeout(resolve, 100)); continue;
  }
  if (!response.ok) throw new Error(result.error ?? 'Workspace access denied.');
  return result;
  }
}
export const authorizeWorkspace = (key: string, target: WorkspaceTarget) => workspaceRequest<AuthorizedWorkspaceArtifact>(key, '/authorize', target);
