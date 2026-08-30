import { spawn } from 'node:child_process';

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

export async function moveToOsTrash(target: string): Promise<void> {
  if (process.platform === 'win32') {
    const escaped = target.replaceAll("'", "''");
    const script = [
      'Add-Type -AssemblyName Microsoft.VisualBasic',
      `[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory('${escaped}', [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs, [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)`,
    ].join('; ');
    await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
    return;
  }
  if (process.platform === 'darwin') {
    const escaped = target.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
    await run('osascript', ['-e', `tell application "Finder" to delete POSIX file "${escaped}"`]);
    return;
  }
  try {
    await run('gio', ['trash', target]);
  } catch {
    await run('trash-put', [target]).catch(() => {
      throw new Error('No supported OS trash command was found. Install gio or trash-cli; the platform will not permanently delete the app.');
    });
  }
}
