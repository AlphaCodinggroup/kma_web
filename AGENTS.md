# KMA Web agent instructions

## Scope and evidence

- KMA Web is the admin/QC console for the KMA field-audit product: projects, facilities, flows,
  audit review, and consolidated PDF reports. It is a Next.js App Router BFF over a Go/Lambda
  backend; it has no database of its own.
- Sibling repos normally live at `../kma-backend` (Go backend, source of every contract) and
  `../KMA_app` (mobile, the other consumer of those contracts). Verify a checkout exists and note
  its branch before treating it as available.
- Read the relevant implementation, `src/shared/config/env.ts`, and tests before changing behavior.
  Treat documentation, code comments claiming a backend limitation, and `../kma-backend/docs/*` as
  evidence of an earlier state until checked against the current code on both sides.
- Distinguish current behavior from intended requirements. Label material findings `CONFIRMED`,
  `INFERRED`, `UNVERIFIED`, or `CONTRADICTION` when that distinction affects a decision. Do not turn
  an observed defect into a standing business rule.
- Read [project context](docs/agents/project-context.md) by topic when needed; do not load its
  entire contents for every task.

## Working agreement

- An implementation request authorizes changes and verification within its scope. Read-only and
  planning requests do not authorize implementation. Publishing, deployment, and destructive
  operations require authorization covering those actions; do not request it again when already
  provided. A push to `main` or `develop` deploys through Amplify (`amplify.yml`); treat it with the
  same care as a direct deploy.
- Before claiming something "is safe" or "can be simplified," trace every producer and consumer of
  the affected data across the BFF route, the backend handler, the web UI, and mobile when the
  contract is shared. State explicitly what was not verified rather than assuming it is covered.
- Preserve unrelated staged and unstaged changes. Avoid opportunistic refactoring.
- Follow the existing FSD-like layering (`app`, `src/{processes,widgets,features,entities,shared}`)
  and each feature's established split between `api` (port + impl), `lib/usecases`, `lib/hooks`, and
  `ui`. Known layering violations are cheaper to leave alone than to fix as a drive-by; see
  [project context](docs/agents/project-context.md#architecture-boundaries).
- Read configuration only from `src/shared/config/env.ts`. Domain constants and test fixtures may
  use literals; anything environment- or deployment-specific may not.
- Maintain agent instructions in English; write code comments in Spanish, matching the existing
  codebase, and keep the product UI in English.

## Contracts and business invariants

- The backend Go DTO is the source of truth for a contract. Mappers under `src/entities/*/lib` must
  tolerate an absent field; they must not invent one the backend does not send.
- `src/shared/api/backend-proxy.ts` is the only path from an `app/api/**/route.ts` handler to the
  backend. Preserve its guarantees: 401 without a session cookie, `forwardQuery` as the sole
  allowlist for reenqueued query params, `numericQuery` capping `limit` at `LIST_LIMIT_MAX` (200),
  body validated before the upstream call so a bad request is a 400 and not a 502, and `pathSegment`
  encoding every path parameter.
- Preserve the upload proxy's safeguards (`app/api/uploads/proxy/route.ts`): host allowlist from
  `UPLOAD_PROXY_ALLOWED_HOSTS`, protocol check, no embedded credentials, and `redirect: "manual"`.
- `verifyAccessToken` (`src/shared/auth/verify-access-token.ts`) is the only source of a verified
  role; it fails closed in production when `COGNITO_JWKS_URL` is unset. Do not reintroduce decoding
  a JWT without verifying it outside that documented non-production fallback.
- The audit state machine lives in the backend (`../kma-backend/lambdas/shared/statemachine`); do
  not encode a different one here. QC editing requires `draft_report_in_review` and an admin role;
  UI disabling is not authorization, the backend and API Gateway authorizer are.
- A report is per project, not per audit: the backend consolidates every eligible audit's findings
  into one PDF and one `report_url`. The QC preview mirrors `reports-worker`'s PDF format
  (`src/shared/lib/report-format.ts`); changing one requires checking the other.
- `isAllowedReturnPath` (`src/features/audits/lib/audit-edit-href.ts`) is the only guard against an
  open redirect through `returnTo`; do not accept an unvalidated redirect target elsewhere.
- Do not lower the coverage thresholds in `vitest.config.ts`, and do not add a `file:`, `link:`, or
  git dependency.

## Development and verification

Run these from the repository root.

| Purpose | Command | Scope |
| --- | --- | --- |
| Install | `npm ci` | Node 22, matching CI and the Dockerfile. |
| Lint | `npm run lint` | |
| Typecheck | `npm run typecheck` | |
| Unit tests | `npm run test:run`; a single file: `npx vitest run <path>` | `npm test` is watch mode. |
| Coverage gate | `npm run test:coverage` | 90% floors in `vitest.config.ts`; `COVERAGE_MIN` can only raise them. |
| Build | `npm run build` | Needs the variables `env.ts` validates; see `.github/workflows/ci.yml`'s `build` job for compile-time values. |
| Full verification | `npm run verify` | lint + typecheck + coverage + build, in that order; matches what CI's two jobs run together. |
| Local platform | In `../kma-backend`: `make up`, then `make seed-docker` or `make seed` | Web at `http://localhost:3000`; mock Cognito `admin`/`admin123`. Shared, mutable stack. |
| Browser E2E | `npm run test:e2e` | Needs the local platform running; writes data; not run in CI. |

- Run lint, typecheck, and the affected unit tests for an implementation change; run `npm run verify`
  before calling a cross-cutting change done.
- Instruction-only or documentation-only edits need a link and command check, not the application
  suite.
- A change to the local `frontend` Docker service needs `../kma-backend`'s `docker compose build
  frontend`, because its bind mounts (`src`, `app`, `public`, and top-level configs) do not include
  `package.json` or `vitest.config.ts`.

## Load task-specific guidance

- For a BFF route, backend contract, or DTO/mapper change, use
  [kma-web-contract-change](.agents/skills/kma-web-contract-change/SKILL.md) and the
  [contracts and mismatches](docs/agents/project-context.md#domain-and-contracts) section of
  project context.
- For the QC report preview, saving findings, approving, or the PDF/report journey, use
  [kma-web-qc-report](.agents/skills/kma-web-qc-report/SKILL.md) and the
  [report rules](docs/agents/project-context.md#report-rules) section of project context.
- For running the app against the local backend, seeding, browser verification, or Playwright, use
  [kma-web-local-validation](.agents/skills/kma-web-local-validation/SKILL.md).
- For auth, session, or role questions, read the
  [auth and session](docs/agents/project-context.md#auth-and-session) section of project context
  before changing `src/processes/auth`, `verify-access-token.ts`, or `app/api/session*`.
- For CI, coverage, or Amplify deploy questions, consult the
  [CI and deploy](docs/agents/project-context.md#ci-and-deploy) section only when relevant.
