# KMA Web project context for agents

Read the section relevant to the task. `CONFIRMED` means code or a focused test supports a claim;
`INFERRED` follows from evidence but was not exercised; `UNVERIFIED` needs a consumer, the live
backend, or a deployed environment; `CONTRADICTION` means sources disagree. A code comment claiming
a backend limitation is documentation, not proof; check the backend before repeating it.

## Boundaries and journeys

- `CONFIRMED:` the browser only calls same-origin `/api/*`; every handler under `app/api/**` proxies
  through `src/shared/api/backend-proxy.ts` to `../kma-backend` (API Gateway → Lambdas).
- `CONFIRMED:` layers are `app/` (routes, BFF) and `src/{processes,widgets,features,entities,shared}`,
  with aliases in `tsconfig.json`. No lint rule enforces the dependency direction; known upward or
  cross-feature imports exist (for example `shared/lib/session-expiration-handler.ts` importing a
  `features/auth` usecase, and `features/audits` importing `features/reports`, `flows`, and `users`).
  Treat this as existing structure, not a bug to fix opportunistically.
- `CONFIRMED:` the QC journey is create/submit on mobile → `send-for-review` (pending → in_review) →
  edit findings in `AuditEditContent.tsx`/`ReportPreview.tsx` → `complete-review` → poll
  `GET /api/reports/{id}` → download. See [report rules](#report-rules) for the per-project PDF.
- `INFERRED:` non-admin web use is contemplated (the backend dashboard scopes a non-admin to their
  assigned projects), but the web has no route guard by role beyond hiding the `/users` sidebar link
  (`src/widgets/shell/SidebarNav.tsx`). `UNVERIFIED` whether the backend enforces role on every route
  this implies.

## Architecture boundaries

- `CONFIRMED:` `src/shared/api/backend-proxy.ts` (`proxyToBackend`, `pathSegment`, `LIST_LIMIT_MAX`)
  is the single BFF-to-backend path; see the invariants in [`AGENTS.md`](../../AGENTS.md).
- `CONFIRMED:` React Query is the only server-state layer (`src/shared/providers/query-provider.tsx`,
  defaults `staleTime` 2min/`gcTime` 5min); the only context is `src/processes/auth/context.tsx`.
  Forms mostly use hand-rolled `useState`; only `LoginForm.tsx` uses react-hook-form + zod.
- `CONFIRMED:` no i18n library. UI strings are English; code comments are Spanish; `app/layout.tsx`
  sets `<html lang="es">`, a `CONTRADICTION` with the English UI.

## Auth and session

- `CONFIRMED:` login is server-side Cognito `InitiateAuth` (`POST /api/session`,
  `src/features/auth/api/cognito.repo.impl.ts`), setting three cookies from
  `commonCookieOptions()`/`setSessionCookies()` in `app/api/session/route.ts`: an httpOnly access
  token, an httpOnly refresh token (30-day fallback TTL), and a non-httpOnly flag cookie the code
  never reads back.
- `CONFIRMED:` `AuthGuard` (`src/processes/auth/guard.tsx`) only checks that the access-token cookie
  exists; it does not verify the JWT. An expired or forged cookie still renders the shell, and the
  first `/api/*` call then gets a 401.
- `CONFIRMED:` `verifyAccessToken` (`src/shared/auth/verify-access-token.ts`) is the only place that
  verifies the token against the JWKS and checks the issuer when `COGNITO_ISSUER` is set. It fails
  closed in production without `COGNITO_JWKS_URL`, and decodes unverified only outside production.
  Its only consumer is `getServerSession()` (`src/processes/auth/session.ts`), which builds the UI
  `Session`; the BFF itself never verifies the token, it only forwards it as a bearer.
- `CONFIRMED:` on the client, `src/shared/interceptors/auth.ts` handles a 401 from `/api/*` (except
  `/api/session` and `/api/session/refresh`) with a single shared `POST /api/session/refresh` call, a
  queue for concurrent 401s, and one retry; a second 401 triggers logout. Auth interceptor installs
  before the error interceptor (`src/shared/api/http.client.ts`) so it sees the raw status.
- `CONFIRMED:` the role comes from the Cognito claim `cognito:groups`, parsed by
  `src/shared/auth/cognito-groups.ts` to tolerate the array-or-`"[admin qc]"`-string shape API
  Gateway can produce. `pickRole` (`src/entities/user/lib/mappers.ts`) falls through to the group
  string for an unknown group (for example `qc`), which is outside the `Role` type
  (`src/entities/user/model/sessions.ts`). `isAdmin` is the only capability flag used in the UI; the
  BFF enforces no role.

## Domain and contracts

- `CONFIRMED:` `AuditStatus` (`src/entities/audit/model.ts`) has 4 values; the backend state machine
  (`../kma-backend/lambdas/shared/statemachine/audit_state.go`) has 5 plus `deleted`, including
  `audit_in_progress`. `toAuditStatus` (`src/entities/audit/lib/audit-status.ts`) falls back to
  `draft_report_pending_review` for an unknown status, so an in-progress mobile audit shows as
  pending review in the web.
- `CONFIRMED:` `app/api/audits/route.ts` only forwards `status`, `auditor`, `limit`, `last_eval_id`.
  The backend accepts `project_id` and, when given it, includes completed audits (unlike the
  default listing). `useProjectAudits.ts`'s comment that "the backend doesn't filter by project" is
  stale; wiring `project_id` through the BFF removes its two-call, client-side-filter workaround.
- `CONFIRMED:` `GET /projects/{id}/facilities` on the backend now returns each facility's full detail
  (address, city, status). `ProjectDetailView.tsx` still fetches every active facility instead.
- `CONFIRMED:` `UpdateFindingRequest` on the backend accepts `measurements: [{name, value}]` and an
  optional `?mitigation_id=` to disambiguate a shared `question_code`.
  `audit-review-finding-update.mappers.ts`'s `UpdateAuditFindingDTO` has no `measurements` field, and
  `ReportPreview.tsx` locks the measurement field with the string "Editable once the backend supports
  it" — that lock is now stale on the backend side.
- `CONFIRMED (send-for-review mismatch):` `sendReview.mappers.ts`'s `SendForReviewDTO` expects
  `audit_review_id` and `review_ready`; the backend's `SendForReviewResponse` sends neither. So
  `auditReviewId` is always undefined, `usePoollAuditReview.ts`'s polling never starts, and
  `onReady`-driven refetches in `audits/page.tsx` and `ProjectDetailView.tsx` never fire from that
  path. Navigation to the edit page still works because it is driven by mutation success, not by the
  poll.
- `CONFIRMED:` `audit-detail.mappers.ts` reads `completedDate` from a field the backend does not send
  (it sends `completed_at`); the edit page substitutes `updatedAt` as a workaround
  (`app/(standalone)/audits/[id]/edit/page.tsx`).
- `CONFIRMED:` the project DTO's `code` and the facility DTO's `projectId`/`userIds` have no backend
  counterpart and are always empty; the backend ignores `code` and `status` sent on project
  create/update. Do not treat these as real fields when extending the project or facility mapper.
- `CONFIRMED (known bug):` `useDeleteReport.ts` invalidates `["reports","list"]`; the list's real key
  is `["reports", filters ?? {}]` (`useReportsQuery.ts`). Deleting a report does not refresh the
  table until `staleTime` (60s) elapses.
- `INFERRED (pagination):` `audit.repo.impl.ts` follows the backend's cursor up to 200 rows or 50
  pages because the backend caps a page at 100; past that, `audits/page.tsx` switches to a "server"
  pagination mode that ignores the search box and does not fetch further pages on navigation. Verify
  this in the audit count that exists before assuming client-side pagination is safe.

## Report rules

- `CONFIRMED:` a report is per project. The backend's `reports-worker` consolidates every audit whose
  review is `final_report_sent_to_client` or `completed` into one PDF at
  `projects/{project_id}/report.pdf`, and the reports list dedupes by project. `ProjectDetailView.tsx`
  picks "the first item with a `reportUrl`", which works only because of that dedup.
- `CONFIRMED:` `useReportDrafts.ts` sends one `PATCH .../findings/{code}` per changed finding,
  sequentially, because the backend has no bulk endpoint and concurrent writes were observed to
  overwrite each other. `diffDraft` compares trimmed strings and sends `""` to clear notes; quantity
  cannot be emptied and 0 clears the calculated cost.
- `CONFIRMED:` `report-format.ts` copies formatting from the backend's `pdf_service.go` and
  `report_formatter_service.go` (amount formatting, unit display, measurement line labels by
  position). Keep both in sync when either changes.
- `CONFIRMED:` editing in `AuditEditContent.tsx` is gated on
  `isAdmin && status === "draft_report_in_review"`. Approve and Download are disabled while there are
  unsaved draft changes; a `beforeunload` handler and a confirm dialog guard navigating away.
- `CONFIRMED:` `useExportAuditReport.ts` polls `GET /api/reports/{id}` at
  `NEXT_PUBLIC_REPORT_POLL_INTERVAL_MS` (default 2000ms) up to `REPORT_TIMEOUT_MS` (default
  180000ms) after `complete-review`. Download uses `src/shared/lib/download.ts`: a streamed fetch to
  a Blob capped at `NEXT_PUBLIC_REPORT_STREAM_MAX_MB` (default 200), falling back to an anchor click.

## BFF and upload proxy

- `CONFIRMED:` every `app/api/**` handler requires the access cookie and returns 401 without it,
  except `POST /api/session` and `POST /api/session/refresh`. None enforces a role; see
  [auth and session](#auth-and-session).
- `INFERRED (possible gap):` `pathSegment`'s `encodeURIComponent` does not stop `".."`
  (`encodeURIComponent("..")` is still `".."`), so a crafted id segment could reach a different
  backend path with the same bearer token. Low blast radius (same-user token, no filesystem access),
  and untested; treat a fix here as a small, isolated change if ever prioritized.
- `CONFIRMED:` `app/api/uploads/proxy/route.ts` enforces an http(s)-only URL, no embedded
  credentials, a host allowlist (`UPLOAD_PROXY_ALLOWED_HOSTS`, default
  `kma-audit-bucket.s3.us-east-2.amazonaws.com`, plus the API base host), and `redirect: "manual"`.
  `CONFIRMED gap:` no request-size limit and no private/loopback-IP block; safety rests on the host
  allowlist alone.

## Config and env

- `CONFIRMED:` `src/shared/config/env.ts` is the only source of configuration, split into
  `publicEnv()`/`PublicEnv` (client-safe, `NEXT_PUBLIC_*`, validated lazily) and `serverEnv()`
  (server-only, throws if called in the browser).
- `CONFIRMED:` local values live in `../kma-backend/docker-compose.yml`'s `frontend` service;
  CI-build placeholders live in `.github/workflows/ci.yml`'s `build` job. `UNVERIFIED:` the real
  production values (Amplify environment variables, `COGNITO_ISSUER`, `COGNITO_JWKS_URL`).
- `CONFIRMED (risk):` `UPLOAD_PROXY_ALLOWED_HOSTS` defaults to a hardcoded S3 bucket host
  (`env.ts`) when unset, rather than failing.

## CI and deploy

- `CONFIRMED:` `.github/workflows/ci.yml` runs on push to `main`/`develop`/`fix-**` and on PRs to
  `main`/`develop`: a `quality` job (lint, typecheck, `test:run`, `test:coverage` with a 90% floor)
  and a separate `build` job. Playwright does not run in CI.
- `CONFIRMED (stale doc):` the coverage step's comment says the threshold "rises as pending modules
  are covered" and points at a plan doc in the backend repo; `vitest.config.ts` already treats 90%
  as the fixed gate.
- `CONFIRMED:` `amplify.yml` builds with `npm ci && npm run build`, publishing `.next`.
  `INFERRED:` production deploys from `develop` (an incident note referenced an Amplify redeploy of
  that branch; `UNVERIFIED` in the current Amplify console).
- `CONFIRMED (risk):` `amplify.yml`'s build step runs `env >> .env` before `npm run build`, writing
  every build-time environment variable, including secrets Amplify may inject, into a `.env` file
  inside the build directory.

## Known defects

- `CONFIRMED:` 10 `FIXME` comments live inside tests, each documenting a live bug (for example, the
  Flow editor not cleaning up references after deleting a step, or renaming a step breaking existing
  references). `rg FIXME` under `src` finds the current list; do not assume it is exhaustive of real
  bugs, only of the ones a test already caught.
- See [domain and contracts](#domain-and-contracts) for the send-for-review response mismatch, the
  reports-list invalidation key mismatch, and the audits pagination edge case.

## Permanent-rule traceability

- The BFF invariants in `AGENTS.md` (allowlisted forwarding, `numericQuery`, `pathSegment`, body
  validated before the upstream call) exist because `backend-proxy.ts`'s own comment documents that
  30 hand-written route handlers had already diverged from each other before it existed.
- The role/authorization invariant exists because the BFF and the UI enforce nothing beyond hiding
  controls; see [auth and session](#auth-and-session).
- The "report is per project" invariant exists because `ProjectDetailView.tsx` and
  `useReportsListQuery` both rely on backend-side dedup by project, not on any per-audit report
  concept in the frontend model.
