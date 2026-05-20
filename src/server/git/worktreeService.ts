export interface WorktreeMetadata {
  branchName: string;
  worktreePath: string;
}

export function createWorktreeMetadata(issueTitle: string): WorktreeMetadata {
  const slug = issueTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "work";
  return {
    branchName: `codex/${slug}`,
    worktreePath: `.worktrees/${slug}`
  };
}
