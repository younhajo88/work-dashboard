import { createRepository, type Repository } from "./repositories";

let repositoryPromise: Promise<Repository> | undefined;

export function getRepository(): Promise<Repository> {
  repositoryPromise ??= createRepository();
  return repositoryPromise;
}
