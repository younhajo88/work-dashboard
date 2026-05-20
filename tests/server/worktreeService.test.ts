import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { createGitWorktree } from "../../src/server/git/worktreeService";

const execFileAsync = promisify(execFile);
const tempRepos: string[] = [];

describe("worktree service", () => {
  afterEach(async () => {
    await Promise.all(tempRepos.splice(0).map((repo) => rm(repo, { recursive: true, force: true })));
  });

  it("creates an isolated git worktree and branch for a request", async () => {
    const repositoryPath = await createTempRepository();

    const worktree = await createGitWorktree({
      repositoryPath,
      issueTitle: "Build runner bridge",
      baseBranch: "main"
    });

    expect(worktree.branchName).toBe("codex/build-runner-bridge");
    expect(worktree.worktreePath).toBe(path.join(repositoryPath, ".worktrees", "build-runner-bridge"));
    await expect(readFile(path.join(worktree.worktreePath, "README.md"), "utf8")).resolves.toContain("seed");
    await expect(git(["branch", "--show-current"], worktree.worktreePath)).resolves.toBe("codex/build-runner-bridge");
  });
});

async function createTempRepository(): Promise<string> {
  const repositoryPath = await mkdtemp(path.join(tmpdir(), "work-dashboard-"));
  tempRepos.push(repositoryPath);
  await git(["init", "-b", "main"], repositoryPath);
  await git(["config", "user.email", "test@example.com"], repositoryPath);
  await git(["config", "user.name", "Test User"], repositoryPath);
  await writeFile(path.join(repositoryPath, "README.md"), "seed\n");
  await git(["add", "README.md"], repositoryPath);
  await git(["commit", "-m", "init"], repositoryPath);
  return repositoryPath;
}

async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout.trim();
}
