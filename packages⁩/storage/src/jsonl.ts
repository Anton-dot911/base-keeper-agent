import { mkdir, appendFile } from "node:fs/promises";
import { join } from "node:path";

export async function appendJsonl(
  dir: string,
  fileName: string,
  event: unknown
): Promise<void> {
  await mkdir(dir, { recursive: true });
  await appendFile(join(dir, fileName), JSON.stringify(event) + "\n", "utf8");
}
