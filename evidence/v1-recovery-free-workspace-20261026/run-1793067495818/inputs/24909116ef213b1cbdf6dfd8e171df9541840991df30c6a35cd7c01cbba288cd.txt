import { mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

/** Retry Windows sharing/permission failures briefly; never remove the destination to force a rename. */
export async function retryWindowsFileOperation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const waits = [25, 50, 100, 200, 400];
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (
        process.platform !== "win32" ||
        !["EPERM", "EACCES", "EBUSY"].includes(
          (error as NodeJS.ErrnoException).code ?? "",
        ) ||
        attempt >= waits.length
      )
        throw error;
      await delay(waits[attempt]);
    }
  }
}

/** Flushed same-directory temporary file, atomic replacement, bounded lock retries and cleanup. */
export async function atomicWriteText(
  file: string,
  content: string,
): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx");
  try {
    try {
      await handle.writeFile(content, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await retryWindowsFileOperation(() => rename(temporary, file));
  } finally {
    await retryWindowsFileOperation(() => rm(temporary, { force: true }));
  }
}
