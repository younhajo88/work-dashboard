import { expect, type Page, test } from "@playwright/test";

async function createRequest(page: Page, title: string, body: string, file: string, area: string) {
  await page.getByPlaceholder("예: 계획 승인 충돌 검사 추가").fill(title);
  await page.getByPlaceholder("수정하거나 추가할 내용을 적어주세요.").fill(body);
  await page.getByPlaceholder("src/app/App.tsx").fill(file);
  await page.getByPlaceholder("dashboard").fill(area);
  await page.getByRole("button", { name: "요청 등록" }).click();
}

test("happy path from request to completed history", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await createRequest(page, "Add safe approval", "승인 전에 충돌을 확인해줘", "src/app/safe-approval.tsx", "approval-safe");
  await expect(page.getByRole("heading", { name: "Add safe approval" })).toBeVisible();

  await page.getByRole("button", { name: "계획 작성" }).click();
  await expect(page.getByText("승인 가능: 충돌 없음")).toBeVisible();

  await page.getByRole("button", { name: "계획 승인 및 작업 시작" }).click();
  await expect(page.getByText("검토 액션")).toBeVisible();
  await expect(page.getByText("3 / 3", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "완료 후 자동 머지" }).click();
  await expect(page.getByText("Add safe approval").first()).toBeVisible();

  await page.getByPlaceholder("요청, 파일, 영역, 커밋 검색").fill("safe-approval");
  await expect(page.locator(".history-item").filter({ hasText: "src/app/safe-approval.tsx" })).toBeVisible();
});

test("persists issues and history after browser reload", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await createRequest(page, "Persistent request", "새로고침 후에도 남아야 한다", "src/app/persist.tsx", "persistence");
  await page.getByRole("button", { name: "계획 작성" }).click();
  await page.getByRole("button", { name: "계획 승인 및 작업 시작" }).click();
  await page.getByRole("button", { name: "완료 후 자동 머지" }).click();

  await page.reload();

  await expect(page.getByText("Persistent request").first()).toBeVisible();
  await page.getByPlaceholder("요청, 파일, 영역, 커밋 검색").fill("persist");
  await expect(page.locator(".history-item").filter({ hasText: "src/app/persist.tsx" })).toBeVisible();
});

test("blocks approval when expected file and area overlap with active work", async ({ page }) => {
  await page.goto("/");

  await createRequest(page, "Conflicting review change", "검토 액션을 또 바꿔줘", "src/app/components/ReviewActions.tsx", "review");
  await page.getByRole("button", { name: "계획 작성" }).click();

  await expect(page.getByText("승인 불가")).toBeVisible();
  await expect(page.getByRole("button", { name: "계획 승인 및 작업 시작" })).toBeDisabled();
});

test("blocks approval while another same-project request has unknown scope", async ({ page }) => {
  await page.goto("/");

  await createRequest(page, "Unknown scope request", "아직 파일 범위를 모르는 요청", "", "");
  await createRequest(page, "Second request", "다른 요청을 승인하고 싶다", "src/app/second.tsx", "second-area");
  await page.getByRole("button", { name: "계획 작성" }).click();

  await expect(page.getByText("Another issue in this project has unknown implementation scope.")).toBeVisible();
  await expect(page.getByRole("button", { name: "계획 승인 및 작업 시작" })).toBeDisabled();
});

test("blocks approval on area-only overlap while allowing unrelated active work", async ({ page }) => {
  await page.goto("/");

  await createRequest(page, "Area only conflict", "파일은 다르지만 검토 영역을 바꿔줘", "src/app/other-review.tsx", "review");
  await page.getByRole("button", { name: "계획 작성" }).click();
  await expect(page.getByText("Functional areas overlap with active or unmerged work.")).toBeVisible();

  await page.reload();
  await createRequest(page, "Unrelated active work", "겹치지 않는 작업", "src/app/unrelated.tsx", "unrelated-area");
  await page.getByRole("button", { name: "계획 작성" }).click();
  await expect(page.getByText("승인 가능: 충돌 없음")).toBeVisible();
});

test("revision requires a comment and returns to re-request clarification", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Seed review item" }).click();
  await expect(page.getByRole("button", { name: "재수정" })).toBeDisabled();
  await page.getByPlaceholder("재수정 코멘트").fill("빈 상태 문구가 의도와 달라요");
  await page.getByRole("button", { name: "재수정" }).click();

  await expect(page.getByText("재요청 구체화")).toBeVisible();
  await expect(page.getByText("빈 상태 문구가 의도와 달라요")).toBeVisible();
});

test("remove deletes unmerged review work and keeps it out of history", async ({ page }) => {
  await page.goto("/");
  page.on("dialog", (dialog) => dialog.accept());

  await page.getByRole("button", { name: "Seed review item" }).click();
  await page.getByRole("button", { name: "제거" }).click();

  await expect(page.getByText("Seed review item")).toHaveCount(0);
  await page.getByPlaceholder("요청, 파일, 영역, 커밋 검색").fill("Seed review item");
  await expect(page.getByText("검색 결과가 없습니다.")).toBeVisible();
});

test("scope-changing comments require replanning instead of mutating the active run", async ({ page }) => {
  await page.goto("/");

  await createRequest(page, "Scope change request", "기본 흐름을 만들어줘", "src/app/scope-change.tsx", "scope-change");
  await page.getByRole("button", { name: "계획 작성" }).click();
  await page.getByRole("button", { name: "계획 승인 및 작업 시작" }).click();
  await page.getByPlaceholder("작업 중 추가 지시 또는 범위 변경 코멘트").fill("추가로 설정 화면도 바꿔줘");
  await page.getByRole("button", { name: "재계획 필요로 기록" }).click();

  await expect(page.locator(".detail .status").getByText("재계획 필요")).toBeVisible();
});

test("failing validation disables complete and runner unavailable reason remains visible", async ({ page }) => {
  await page.goto("/");

  await createRequest(page, "Fail validation path", "검증 실패를 보여줘", "src/app/fail-validation.tsx", "validation-area");
  await page.getByRole("button", { name: "계획 작성" }).click();
  await page.getByRole("button", { name: "계획 승인 및 작업 시작" }).click();

  await expect(page.getByText("Real Codex runner unavailable")).toBeVisible();
  await expect(page.getByRole("button", { name: "완료 후 자동 머지" })).toBeDisabled();
});
