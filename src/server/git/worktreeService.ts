import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface WorktreeMetadata {
  branchName: string;
  worktreePath: string;
}

export interface CreateGitWorktreeInput {
  repositoryPath: string;
  issueTitle: string;
  baseBranch: string;
}

export function createWorktreeMetadata(issueTitle: string, repositoryPath?: string): WorktreeMetadata {
  const slug = slugIssueTitle(issueTitle);
  const relativeWorktreePath = path.join(".worktrees", slug);
  return {
    branchName: `codex/${slug}`,
    worktreePath: repositoryPath ? path.join(repositoryPath, relativeWorktreePath) : relativeWorktreePath
  };
}

export async function createGitWorktree(input: CreateGitWorktreeInput): Promise<WorktreeMetadata> {
  const metadata = createWorktreeMetadata(input.issueTitle, input.repositoryPath);
  await mkdir(path.dirname(metadata.worktreePath), { recursive: true });
  await git(["worktree", "add", "-b", metadata.branchName, metadata.worktreePath, input.baseBranch], input.repositoryPath);
  return metadata;
}

async function git(args: string[], cwd: string): Promise<void> {
  await execFileAsync("git", args, { cwd, windowsHide: true });
}

function slugIssueTitle(issueTitle: string): string {
  return (
    issueTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "work"
  );
}
