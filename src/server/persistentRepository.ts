import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Repository, type RepositorySnapshot } from "./repositories";

export async function createPersistentRepository(filePath: string): Promise<Repository> {
  const snapshot = readSnapshot(filePath);
  return new Repository({
    snapshot,
    onChange: (nextSnapshot) => writeSnapshot(filePath, nextSnapshot)
  });
}

function readSnapshot(filePath: string): RepositorySnapshot | undefined {
  if (!existsSync(filePath)) return undefined;
  return JSON.parse(readFileSync(filePath, "utf8")) as RepositorySnapshot;
}

function writeSnapshot(filePath: string, snapshot: RepositorySnapshot): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
}
