import type { BoardIssue, BoardProject } from "../state/useBoardStore";

interface Props {
  projects: BoardProject[];
  issues: BoardIssue[];
  selectedProjectId: string;
  onSelect: (projectId: string) => void;
}

export function ProjectSidebar({ projects, issues, selectedProjectId, onSelect }: Props) {
  return (
    <aside className="project-sidebar" aria-label="Projects">
      <h1>AI Work Board</h1>
      <div className="project-list">
        {projects.map((project) => {
          const projectIssues = issues.filter((issue) => issue.projectId === project.id);
          const running = projectIssues.filter((issue) => ["running", "validating", "review_request"].includes(issue.status)).length;
          const response = projectIssues.filter((issue) => ["request_clarification", "revision_clarification", "user_input_needed"].includes(issue.status)).length;
          const blocked = projectIssues.filter((issue) => issue.status.startsWith("blocked")).length;
          return (
            <button
              key={project.id}
              className={`project-item ${project.id === selectedProjectId ? "project-item-active" : ""}`}
              onClick={() => onSelect(project.id)}
            >
              <span>{project.name}</span>
              <small>작업중 {running} · 응답 {response}</small>
              {blocked > 0 && <strong className="badge danger">차단 {blocked}</strong>}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
