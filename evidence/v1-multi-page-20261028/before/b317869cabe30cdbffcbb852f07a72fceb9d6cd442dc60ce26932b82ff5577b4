import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';

/**
 * Spawn npm in a way that works on Windows Node 24+ without trying to execute
 * npm.cmd directly. When launched by npm, npm_execpath points at npm-cli.js,
 * so we invoke that JavaScript file with the current Node executable.
 */
export function spawnNpm(args: string[], options: SpawnOptions = {}): ChildProcess {
  const npmExecPath = process.env.npm_execpath;

  if (npmExecPath) {
    return spawn(process.execPath, [npmExecPath, ...args], options);
  }

  if (process.platform === 'win32') {
    const comspec = process.env.ComSpec || process.env.COMSPEC || 'cmd.exe';
    const command = ['npm', ...args].map(quoteCmdArg).join(' ');
    return spawn(comspec, ['/d', '/s', '/c', command], options);
  }

  return spawn('npm', args, options);
}

function quoteCmdArg(value: string): string {
  if (!/[\s"&|<>^()]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}
