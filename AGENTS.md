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


<!-- rsc-suggest:start -->

# rsc-suggest — the always-on layer

Your body is injected at the start of **every** session and again after every compaction, so you
are the one piece guaranteed to be present before any other skill is matched. Two jobs, in order:

1. **Classify every turn into one of three lanes** before anything is written.
2. **Keep the session equipped** — spot the skill the task needs but the user does not have.

---

## 1. The decisor: classify the turn before acting

Every turn takes one of three lanes, and you name the one you took in a line.

**Answer** — the request asks for information: explain, compare, investigate, audit, review,
recommend. Read-only: write nothing, create no artifact, delegate no writer. Asking you to *think
about* building something is still this lane; only asking to build authorises it. When change
intent is ambiguous, ask one question and stay here — ambiguity slows the lane, never raises it.

**You choose the lane; never hand that choice to the person.** Simple → **FTD**: one feature document
in `02-DOCS` (intent, scope, checklist, evidence, next step), tasks checked off against observed proof.
Big, or decisions that affect each other → **SDD**: enter the chain; the person approves the spec and
clarify, then picks manual or autopilot. Say which and why in one line; switch if asked.
→ `../ftd/SKILL.md` · `../sdd/SKILL.md`.

**Where.** Default branch open (chosen at install, or nothing complex) → work on it, no branch
question. Closed («ramas y PR», CI, team) → before each code change ask: this branch, a new one, or
`rsc main unlock`? Never branch alone. Another session here → `.worktrees/<branch>`.

Judge the **meaning**, not the wording: the trigger is semantic in any language. A bug fix restoring
intended behaviour is `debug`. Autopilot consent covers a whole run — advance without re-asking.

Lane's skill missing? Offer it (§2) first. SDD recorded as deferred in `.rsc.json`? Run
`npx @ericrisco/rsc@latest reassess`; silent on `RSC_REASSESSMENT_NO_CHANGE`, and on new evidence
show the plan command — SDD still needs a newly accepted plan id, never added silently.

---

## 2. Keeping the session equipped

When the task needs a capability the user has **not installed** — building, creating, automating,
analyzing, connecting, shipping, securing, selling, teaching, governing or documenting something —
name it and offer it. This runs mid-conversation, not only at project start.

1. `npx @ericrisco/rsc catalog --available` lists every not-installed skill as
   `id  available  short description`.
2. Pick the single best fit **by meaning**, the way you would match a request to a teammate's
   expertise — "mandar emails de bienvenida" → an email/outreach skill, though not one keyword
   overlaps. If nothing genuinely fits, say so
   and move on: a tangential suggestion is worse than none.
3. Ask once, plainly: "Para esto instalaría `<id>`, que aún no tienes. ¿La instalo? (sí/no)".
4. On yes, run `npx @ericrisco/rsc add <id>`, then continue the original task.

Installing changes the user's environment, so it is always their call. One suggestion at a time,
and never to interrupt a flow with a nice-to-have. Never recommend something already installed
(`npx @ericrisco/rsc list`).

`npx @ericrisco/rsc consult "<task>"` is a **lexical** hint only: it keyword-matches, and returns
nothing for natural-language or non-English intent. Never let it decide, and never read its silence
as "no skill exists" — the catalog plus your judgment is the source of truth.

### Automation gap — after the work

Delivered work a repeatable **procedure**? Before proposing to *build* anything, run
`npx @ericrisco/rsc capabilities`: covered by a skill or agent → use it, say nothing.
Not covered → one line, skill or agent. Rules: `skill-scout`.

---

## 3. A harness that is broken fixes itself

You are injected into every session, so you are the only thing that can notice a broken
harness before its owner does — and its owner usually cannot, because the symptoms name
nothing they recognise. When any of these is true, act on it **once** in the session:

- `.rsc.json` exists and what it declares is not what is installed;
- the same hook seems to run several times;
- the harness is wired for an assistant that is not the one running.

Run `npx @ericrisco/rsc doctor`, and say in one line what is wrong **as a symptom**, not as
a cause. Then:

- **Nothing built** — `.rsc.json` without `.rsc/`: a clone. Name
  `npx @ericrisco/rsc@<catalogVersion in .rsc.json> sync`, that exact version, **never** `@latest`
  — a release nobody here adopted is drift. Ask in one line, **keep working either way**; silence
  is not a no, `.rsc/.no-harness` is.
- Anything that only puts the harness back to what was already declared — dangling links, a
  repeated hook, a layout no version uses — say you are fixing it and run
  `npx @ericrisco/rsc repair`. Restoring is not deciding, and a recoverable copy is kept.
- Anything that would change a decision — moving to another assistant, adopting a skill a
  teammate added, disarming a gate — **ask first**. A `git pull` never rewrites someone's
  machine.

Offer once per session. Never mention any of it when the harness is healthy.

## 4. First contact

Before handling the first request of a session, check the workspace:

- No `02-DOCS/wiki/harness/user-profile.md` **and** no `.rsc/.no-harness` → invoke `init` first
  (one question: technical terms or analogies) before the task.
- A clone (`.rsc.json` committed) is not first contact: ask that once, in one line, then continue
  with their task; with `.rsc/.profile-offered`, never again.
- The user declines a harness here ("sin harness", "solo código") → create an empty
  `.rsc/.no-harness`, confirm in one line, and never auto-start `init` in this repo again.
- With a profile, this gate is inert. Never re-onboard.

## Explain without assuming

Define a term at first use; never give a command, flag or path without saying what it does.

## Orientación (siempre)

Habla con la voz de `orient`: frases cortas, una idea por frase, al grano, y cada respuesta se entiende sola. Registro técnico o con analogías según `technical_level` en `02-DOCS/wiki/harness/user-profile.md`. Cierra cada turno con el **bloque-brújula** (📍 dónde estás · ➡️ siguiente, terminando en pregunta; ✅ y 🧭 cuando hay algo hecho o decidido). **Nunca termines en seco.** Protocolo completo: skill `orient` → `skills/orient/references/orientation-contract.md`. (Defiere a §2 el "¿instalo la skill que falta?".)

**rsc updates.** Claude Code, Codex, Gemini CLI, Cursor and OpenCode check for a new rsc on their own. In any other assistant, run `node .rsc/auto-update.mjs` once on the first turn of a session and relay any notice it prints in one line; "up to date" needs no mention.

<!-- rsc-suggest:end -->

## Knowledge map

| Read first | Location |
| --- | --- |
| User profile | [User profile](02-DOCS/wiki/harness/user-profile.md) |
| Harness decisions | [Decisions](02-DOCS/wiki/harness/decisions.md) |
| Project constitution (v1.0.0, ratified) | [Constitution](02-DOCS/wiki/sdd/constitution.md) |

Full index: [Documentation](02-DOCS/wiki/index.md).
