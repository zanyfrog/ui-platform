import { readFile } from 'node:fs/promises';
import { atomicWriteText } from '@ui-platform/artifacts/storage';
export { atomicWriteText };

export async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

export async function atomicWriteJson(file: string, value: unknown): Promise<void> {
  const serialized = JSON.stringify(value, null, 2) + '\n';
  JSON.parse(serialized);
  await atomicWriteText(file, serialized);
}
