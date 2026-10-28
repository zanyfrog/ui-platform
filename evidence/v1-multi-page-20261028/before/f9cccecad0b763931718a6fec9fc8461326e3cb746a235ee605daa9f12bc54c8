import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export async function appendHistory(appDir: string, event: Record<string, unknown>): Promise<void> {
  const historyDir = path.join(appDir, 'history');
  await mkdir(historyDir, { recursive: true });
  await appendFile(
    path.join(historyDir, 'app-history.jsonl'),
    JSON.stringify({ time: new Date().toISOString(), ...event }) + '\n',
    'utf8',
  );
}
