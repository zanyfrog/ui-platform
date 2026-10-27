import * as fs from 'd6-r1-real-fs';
import path from 'node:path';
export const events: Array<{ op: string; file: string }> = [];
let root = '';
export let fault: ((op: string, file: string) => void) | undefined;
export function configure(directory: string, inject?: typeof fault) { root = path.resolve(directory); fault = inject; events.length = 0; }
export function inject(value?: typeof fault) { fault = value; }
function check(op: string, file: string) {
  const target = path.resolve(String(file));
  const inside = target === root || target.startsWith(root + path.sep);
  const ancestor = op === 'lstat' && (root === target || root.startsWith(target.endsWith(path.sep) ? target : target + path.sep));
  if (!root || !inside && !ancestor) throw new Error('OUTSIDE_DISPOSABLE_FIXTURE: ' + op);
  events.push({ op, file: target }); fault?.(op, target);
}
export const lstat = async (file: string) => { check('lstat', file); return fs.lstat(file); };
export const realpath = async (file: string) => { check('realpath', file); return fs.realpath(file); };
export const readFile = async (file: string, ...args: any[]) => { check('readFile', file); return fs.readFile(file, ...args); };
export const readdir = async (file: string, ...args: any[]) => { check('readdir', file); return fs.readdir(file, ...args); };
export const mkdir = async (file: string, ...args: any[]) => { check('mkdir', file); return fs.mkdir(file, ...args); };
export const rm = async (file: string, ...args: any[]) => { check('rm', file); return fs.rm(file, ...args); };
export const chmod = async (file: string, ...args: any[]) => { check('chmod', file); return fs.chmod(file, ...args); };
export const rename = async (from: string, to: string) => { check('rename', from); check('rename', to); return fs.rename(from, to); };
export const link = async (from: string, to: string) => { check('link', from); check('link', to); return fs.link(from, to); };
export const open = async (file: string, ...args: any[]) => {
  check('open:' + args[0], file);
  const handle = await fs.open(file, ...args);
  return {
    writeFile: async (...values: any[]) => { check('handle.writeFile', file); return handle.writeFile(...values); },
    sync: async () => { check('handle.sync', file); return handle.sync(); },
    close: async () => { check('handle.close', file); await handle.close(); check('handle.closed', file); },
  };
};
