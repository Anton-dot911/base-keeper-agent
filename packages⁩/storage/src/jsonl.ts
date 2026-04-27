import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

export async function appendJsonl(dataDir: string, fileName: string, event: unknown): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const fullPath = path.join(dataDir, fileName);
  await appendFile(fullPath, `${JSON.stringify(event)}\n`, "utf8");
}
