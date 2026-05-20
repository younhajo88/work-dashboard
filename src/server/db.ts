import { createRepository, type Repository } from "./repositories";

let repositoryPromise: Promise<Repository> | undefined;

export function getRepository(): Promise<Repository> {
  repositoryPromise ??= createSeededRepository();
  return repositoryPromise;
}

async function createSeededRepository(): Promise<Repository> {
  const repo = await createRepository();
  repo.createProject({
    name: "작업대시보드",
    repositoryPath: process.cwd(),
    defaultBranch: "master",
    requiredValidationCommands: ["npm run test", "npm run build"]
  });
  return repo;
}
