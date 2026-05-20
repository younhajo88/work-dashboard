import path from "node:path";
import { type Repository } from "./repositories";
import { createPersistentRepository } from "./persistentRepository";

let repositoryPromise: Promise<Repository> | undefined;

export function getRepository(): Promise<Repository> {
  repositoryPromise ??= createSeededRepository();
  return repositoryPromise;
}

async function createSeededRepository(): Promise<Repository> {
  const repo = await createPersistentRepository(process.env.WORK_BOARD_STATE_PATH ?? path.join(process.cwd(), ".work-board", "state.json"));
  if (repo.listProjects().length === 0) {
    repo.createProject({
      name: "작업대시보드",
      repositoryPath: process.cwd(),
      defaultBranch: "master",
      requiredValidationCommands: ["npm run test", "npm run build"]
    });
  }
  return repo;
}
