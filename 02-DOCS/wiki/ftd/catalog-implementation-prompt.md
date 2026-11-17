---
type: feature
title: Prompt para implementar Catalog
author: Pablo
branch: new-ui
status: in-progress
date: 2026-10-21
tags: [catalog, prompt, skills]
---

# Prompt para implementar Catalog

## Intención

Preparar un encargo ejecutable para agregar Catalog debajo de Reports en `new-ui`, con selección manual de Excel y reemplazo completo del catálogo mediante una carga validada y recuperable.

Este documento entrega el prompt y las skills solicitadas; la sección Catalog y el nuevo sistema de importación todavía no están implementados.

## Alcance

La preparación modifica únicamente este documento y su enlace en el índice de KMA Web; conserva los cambios previos de dependencias y documentación, y no modifica MEDM, el backend ni datos en AWS.

El prompt está en inglés, como las instrucciones para agentes del proyecto, y distingue el comportamiento comprobado de la solución propuesta.

### Prompt para copiar y ejecutar

```text
ROLE
You are the engineer implementing KMA Catalog management across the existing
Next.js admin console and Go/Lambda backend; ground decisions in these repositories.

TASK
Implement a complete Catalog section in the new-ui frontend: an administrator
selects an Excel file, validates it, reviews the proposed replacement, confirms
the import, and can restore a previously completed catalog version.
Deliver working local code with evidence for the acceptance scenarios below.

CONTEXT AND WORKSPACE
Frontend: /home/pablocristo/Proyectos/alphacoding/kma_web/.worktrees/new-ui
Branch: new-ui. The old frontend is main; the requested UI belongs to new-ui.
Backend: /home/pablocristo/Proyectos/alphacoding/kma-backend/.worktrees/catalog-versioning
Branch: feat/catalog-versioning. Verify these paths, branches, and current diffs.
Reference workbook: /home/pablocristo/Proyectos/alphacoding/kma-backend/catalog-import.xlsx
The process started from another project, MEDM; this task belongs entirely to KMA.

Read each repository's applicable AGENTS.md, constitution, relevant context, and
the skill manifest accompanying this prompt before editing; follow the applicable
SDD process and record real decisions and evidence, without inventing approvals.
Preserve the existing changes and other sessions. Work inside the worktrees above.
Resolve sibling repositories explicitly: ../kma-backend from the FE worktree is
not the actual backend checkout. Discover symbols through Codebase Memory first;
use direct reads when the graph is insufficient and for configuration/literals.
Use the exact versions in package-lock.json and the affected Go modules; the FE
manifest uses Next.js 15, React 19, Vitest 2, and its checks use Node 22.

CONFIRMED BASELINE — RECHECK IF SOURCE OR WORKBOOK CHANGES
- Workbook SHA-256: 2cc21a42e49f50a4fb92d2efc79ae2b4ccaea80dc5eafcede46fe047f78f6b33.
- The real Go Excel parser and domain mapper accepted 1,843 catalog rows across
  52 flows; there were zero duplicate storage keys and zero domain errors.
- The Catalog sheet has 1,843 data rows; Pending variants has 4 rows that the
  current first-sheet importer excludes. Eight imported rows have valid zero cost.
- This evidence establishes parser/domain compatibility, not a successful database
  import or proof that every flow code matches a deployed flow definition.
- Existing upload: POST /api/admin/catalog/upload with JSON file_name and base64
  file_content; success is a flat object with message, file_name, uploaded_at.
- The existing use case validates rows, then ReplaceAll writes batches and deletes
  stale keys; it can expose mixed contents if persistence fails partway through.
- Shared catalog storage uses flow_code and catalog_item_id, with the latter
  derived from barrier_id and question_code. Preserve absent-versus-zero semantics.
- Catalog API readers, audit enrichment, and reports-worker consume this data.
- Earlier read-only AWS inspection found main and new-ui connected to the same
  dev API. Treat environment mapping as dated evidence, recheck before any later
  release, and never assume the new-ui hostname isolates catalog data.

REQUIREMENTS

1. User interface
Place the exact label Catalog immediately below Reports in the Workspace group
of src/widgets/shell/SidebarNav.tsx, with a suitable existing Lucide icon and the
usual active state; make it work in desktop and mobile navigation.
Use /catalog and restrict management to the verified administrator role, matching
the backend's role rules; keep existing catalog-reading consumers authorized as before.
Reuse new-ui layout, tokens, typography, components, spacing, light/dark themes,
and feedback patterns. Prioritize a clear upload workflow over decorative panels.

Show current catalog metadata when available, a labelled .xlsx file picker, file
name/size, validation results, errors with actionable row/column references,
warnings, record/flow counts, a bounded preview, and import/version history.
Manual file selection is required; drag-and-drop is optional and must retain the picker.
Use English UI copy, including Choose Excel file, Validate file, Replace catalog,
and Restore version. Clearly explain that replacement removes omitted records
from the active catalog and retains the previous complete version for recovery.

Sequence: choose -> validate -> review -> explicitly confirm -> import -> show
the committed result. Selecting a different file invalidates the prior preview.
Make loading, empty, failure, conflict, unknown completion, and success states
explicit; preserve the selected file on recoverable errors. Prevent duplicate
submissions while a request is running. If an action is unavailable, explain why.
Use real observed stages; show a percentage only if it measures actual progress.
Do not report success optimistically. Reconcile an uncertain network outcome with
server status before offering another attempt.
Use keyboard-operable controls, visible focus, accessible dialog focus handling,
associated labels/errors, live status announcements, and readable mobile tables.

2. Validation and preview
Reuse the backend Excel parser and domain rules as the authority; do not create
a conflicting browser parser. Validation performs no catalog writes.
Validate the actual XLSX structure, the selected worksheet, required header
aliases, every applicable row, finite numeric costs, storage key uniqueness,
and safe bounds for bytes, decompressed content, rows, and cell lengths.
Preserve current merged-cell/header handling, meaningful optional values, and
valid cost=0; reject negative/non-finite costs and ambiguous duplicate keys.
Reject an empty or invalid catalog with zero active-data changes.
Treat worksheet text, filenames, and cell values as untrusted data; render them
as text and never execute formulas, macros, embedded instructions, or external links.

Specify worksheet selection explicitly: prefer Catalog by name; preserve the
existing accepted first-sheet format where unambiguous. Show excluded-sheet
warnings, including the 4 Pending variants rows in the reference workbook.
Return the file digest, counts, bounded sample, warnings, and active revision
observed for the preview. Validate again on import, or bind the preview to an
immutable server-validated artifact; do not trust client-supplied counts or flags.
For any flow-code cross-check, reuse existing normalization and aliases and
report unmapped values rather than inventing mappings or silently dropping rows.

3. Complete replacement with recoverable versions
Prefer immutable staged versions and a single conditional active-version switch.
Record the exact key layout, compatibility approach, and state transitions before
coding; select the simplest layout that meets all reader and failure invariants.
Do not delete the active catalog before writing its replacement, and do not treat
a multi-batch write as an atomic transaction.

Write a new version outside the active namespace, validate completion, mark it
ready, then activate it only if the expected active revision still matches.
Use a revision token that changes on every activation, including restore; comparing
only a content hash is insufficient after an A -> B -> A sequence.
Return a clear conflict when another administrator changed that revision.
On parse/write/timeout/cancellation failure before activation, preserve the old
active pointer and contents. An incomplete version is never selectable for restore.

Bound write concurrency and batch sizes; retry only unprocessed items with bounded
exponential backoff/jitter and context cancellation. Handle exhausted retries and
conditional-write failures explicitly. Keep completed versions immutable even
when duplicate or overlapping import requests arrive.
Use a server-computed checksum for content identity and an explicit operation
identity for safe retries. Replaying a completed request must return its recorded
outcome without reactivating an old version after a later import or restore.
Define what happens if the server commits but its response is lost.

Record version, checksum, filename, counts, timestamps, authenticated actor,
state, and activation/restore metadata; never trust actor data in the request body.
Provide history and conditional restore of complete versions. Treat pre-versioned
data as a supported legacy baseline with a recoverable migration path.
Never interpret an access error or malformed active pointer as an empty legacy catalog.
Keep historical versions available; document bounded retention and cleanup as a
separate follow-up, with no automatic deletion of legacy/current/in-use versions.

4. Consistent readers and compatibility
Trace every reader/writer, including lambdas/catalog, shared contracts,
audit-enrichment-processor, reports-worker, web BFF, and relevant mobile calls.
Read one catalog version per catalog-dependent operation and keep that selection
stable across its queries/pages; do not resolve the active pointer for every row.
Ensure a newly activated version is fully readable: a strongly consistent pointer
alone does not guarantee visibility if its data queries are eventually consistent.
Use appropriate read consistency and fail closed on unreadable metadata.
Keep internal version prefixes and metadata out of existing business IDs and DTOs.
Apply version selection to fallback queries and scans too; prevent query cost from
growing with all stored historical versions. Preserve pagination where applicable.
Preserve captured audit answers, QC edits, quantities, costs, and generated reports;
catalog replacement must not silently rewrite historical audit/report data.

5. API, authorization, and transport
Define the request/response/error contract for validation, current status, history,
import, operation reconciliation, and restore before wiring the UI.
Keep existing upload/read paths and flat response shapes compatible; document any
new optional fields or separate routes. Derive frontend types from the real Go DTOs.
Use src/shared/api/backend-proxy.ts for every BFF-to-backend call and env.ts for
environment configuration. Validate bodies before proxying and encode path segments.
Preserve verified sessions, server-side admin authorization, and cookie/CSRF defenses.
Update bootstrap routing, local gateway mappings, and the owned infrastructure
definitions needed for new routes; verify literal routes do not become barrier IDs.

Choose file limits from the narrowest real limit across browser/BFF hosting,
API Gateway, Lambda, base64/JSON overhead, parser memory, and execution timeout.
The reference file is 158,303 bytes; the item limit must accept all 1,843 valid rows.
Expose consistent enforced limits to the UI; a config field alone is not enforcement.
Start with the simplest bounded flow that fits measured limits. If it cannot finish
reliably within request deadlines, use durable asynchronous staging/status with
existing storage/queue infrastructure; never continue critical work only in a
background goroutine after returning the HTTP response.
Do not add new services, queues, or large browser dependencies without evidence.

6. Verification and rollout preparation
Use behavioral tests for validation, permissions, compatibility, partial failures,
conditional activation, retry idempotency, and consistent versioned reads.
Exercise actual repository persistence against an isolated local DynamoDB-compatible
store, not only mocks, for write completion, conditions, pagination, and restore.
Use synthetic fixtures and a separate test table/stack; do not seed over another
session's shared data. Test the supplied workbook read-only or in disposable storage.

Frontend: run affected Vitest tests, lint and typecheck, then npm run verify
(lint + typecheck + coverage + build) using Node 22 and existing coverage floors.
Backend: use the affected modules' Go toolchains, gofmt/vet and module tests;
include shared, catalog, and reports-worker modules when their code changes;
audit-enrichment-processor belongs to the root module, not a nested go.mod;
run race checks for concurrent code, and the applicable native make verify checks.
Read native scripts before executing; a root Go test does not cover nested modules.
Use Chrome DevTools MCP for the real local login/upload/preview/confirm/restore
journey, denied access, recovery, and responsive states. A mocked UI is not proof
of the real BFF/backend integration. Never label a skipped check as passed.
Measure parse/import duration, retry counts, and resource use on the reference
file and the configured maximum; report the environment and observed results.

Document release order: version-aware readers and compatible routes first,
versioned writes enabled only after all consumers are ready, then management UI.
Include the effect of old upload clients and the legacy write path in the migration.
Prepare the recovery procedure; switching the data pointer back does not prove
that rolling back binaries to old full-table readers is safe.
Respect existing authorizations; ask only for missing decisions that materially
change behavior or for actions outside the authorized scope.

HARD BOUNDARIES
Keep changes within this feature and preserve other work, existing dependencies,
catalog variants, verified-role checks, and shared contract semantics.
This task authorizes local implementation and validation; it does not authorize
push, merge, deployment, a real AWS catalog import, or deletion of existing data.
Treat this prompt's versioning design as a proposal to validate against the code,
not as a claim that those endpoints or guarantees are already implemented.

OUTPUT CONTRACT
Leave reviewable local changes plus indexed specification/plan/evidence artifacts
required by the repositories. Report concisely in Spanish: what works, checkout
and local URL, workbook validation, checks actually run and their limits, and any
release prerequisites. Show exact contracts and changed-file evidence in the docs.
Distinguish implemented, locally verified, and deployed; never conflate them.

ACCEPTANCE SCENARIOS — USE AS TEST ORACLES
A1. Reference workbook: preview reports 1,843 rows, 52 flows, 0 duplicate keys,
    excludes 4 Pending variants rows with a warning, preserves 8 zero-cost rows,
    and makes zero catalog writes; confirmed import exposes the complete new set.
A2. A malformed workbook, invalid row, duplicate key, or oversized input produces
    an actionable error; the active version and contents remain unchanged.
A3. A batch fails or remains unprocessed after bounded retries: no partial version
    becomes active; existing readers still see the previous complete catalog.
A4. Two uploads/restore operations use the same expected revision: at most one
    activation succeeds; a stale preview still conflicts after an A -> B -> A cycle.
A5. An acknowledged or unacknowledged completed request is retried after another
    version was activated: its result is reconciled without reverting the newer state.
A6. Activation happens during a paginated listing, enrichment, or report operation:
    that operation uses one complete version, including fallback queries.
A7. A non-admin calls the write/validation/restore endpoint directly, bypassing the
    hidden navigation: the server rejects it; existing permitted read paths still work.
A8. A complete earlier version is restored conditionally, with actor/time history;
    incomplete or unknown versions cannot be activated, and audits are unchanged.
A9. Change the selected file after preview, or lose the upload response: the UI
    invalidates the stale preview or reconciles completion without a false success.
A10. A legacy catalog has no active pointer: supported reads still work; corrupted
     metadata or a database read failure never silently selects that legacy fallback.
```

## Checklist

- [x] Leer las reglas y las skills pertinentes: fuentes enumeradas abajo.
- [x] Confirmar el archivo y recuperar su validación: SHA-256 coincidente y resultado del importador real.
- [x] Preparar un prompt con alcance, contrato de entrega y diez escenarios de aceptación.
- [x] Comprobar enlaces y comandos del prompt: Drift focalizado aprobado; diff de Catalog sin whitespace; el diff global conserva CRLF de package/lock ajenos.

## Evidencia

### Skills cargadas

Se leyeron sus `SKILL.md` en esta sesión; ya estaban disponibles y no fue necesario instalar paquetes ni cambiar versiones de RSC.
Las rutas son locales a esta máquina; una sesión nueva debe volver a cargar las que correspondan a su fase.
Las convenciones concretas de KMA prevalecen sobre ejemplos genéricos de versiones, autenticación, formato de respuestas, autoría y despliegue.

| Área | Skills leídas y propósito |
| --- | --- |
| Preparación | [ftd](/home/pablocristo/Proyectos/pablo/medm/.agents/skills/ftd/SKILL.md): registro acotado; [prompt-engineering](/home/pablocristo/Proyectos/pablo/medm/.agents/skills/prompt-engineering/SKILL.md): encargo, restricciones, salida y casos; [sdd](/home/pablocristo/Proyectos/pablo/medm/.agents/skills/sdd/SKILL.md): encadenamiento de implementación. |
| Descubrimiento | [codebase-memory](/home/pablocristo/.codex/skills/codebase-memory/SKILL.md): símbolos y consumidores. |
| Interfaz | [nextjs](/home/pablocristo/.codex/skills/nextjs/SKILL.md), [typescript](/home/pablocristo/Proyectos/pablo/medm/.agents/skills/typescript/SKILL.md), [ui-engineering](/home/pablocristo/.codex/skills/ui-engineering/SKILL.md), [frontend-design](/home/pablocristo/.agents/skills/frontend-design/SKILL.md): límites servidor/cliente, tipos, estados y continuidad visual de `new-ui`. |
| Backend | [go-architecture-pod](/home/pablocristo/Proyectos/alphacoding/kma-backend/.worktrees/catalog-versioning/.agents/skills/backend/go-architecture-pod/SKILL.md), [golang](/home/pablocristo/Proyectos/alphacoding/kma-backend/.worktrees/catalog-versioning/.agents/skills/backend/golang/SKILL.md), [dynamo-entity-standard](/home/pablocristo/Proyectos/alphacoding/kma-backend/.worktrees/catalog-versioning/.agents/skills/backend/dynamo-entity-standard/SKILL.md): módulos, errores, persistencia, concurrencia y recuperación. |
| Contratos | [api-design](/home/pablocristo/Proyectos/pablo/medm/.agents/skills/api-design/SKILL.md), [kma-contract-change](/home/pablocristo/Proyectos/alphacoding/kma-backend/.worktrees/catalog-versioning/.agents/skills/kma-contract-change/SKILL.md), [kma-web-contract-change](../../../.agents/skills/kma-web-contract-change/SKILL.md): compatibilidad de Go, BFF, web y consumidores. |
| Seguridad | [secure-coding](/home/pablocristo/Proyectos/pablo/medm/.agents/skills/secure-coding/SKILL.md): archivo no confiable y autorización en servidor. |
| Pruebas | [testing-go](/home/pablocristo/Proyectos/pablo/medm/.agents/skills/testing-go/SKILL.md), [testing-web](/home/pablocristo/Proyectos/pablo/medm/.agents/skills/testing-web/SKILL.md), [kma-report-regression](/home/pablocristo/Proyectos/alphacoding/kma-backend/.worktrees/catalog-versioning/.agents/skills/kma-report-regression/SKILL.md): fallos, carreras, interfaz e informes. |
| Integración local | [kma-local-validation](/home/pablocristo/Proyectos/alphacoding/kma-backend/.worktrees/catalog-versioning/.agents/skills/kma-local-validation/SKILL.md), [kma-web-local-validation](../../../.agents/skills/kma-web-local-validation/SKILL.md), [browser-debugging](/home/pablocristo/.codex/skills/browser-debugging/SKILL.md): backend local y navegador real. |
| Cierre | [verify](/home/pablocristo/Proyectos/pablo/medm/.agents/skills/verify/SKILL.md), [review](/home/pablocristo/Proyectos/pablo/medm/.agents/skills/review/SKILL.md), [code-review](/home/pablocristo/Proyectos/pablo/medm/.agents/skills/code-review/SKILL.md): evidencia y revisión del resultado. |
| Documentación | [drift](/home/pablocristo/.agents/skills/drift/SKILL.md): enlaces y correspondencia entre documentación y código. |

Las skills de cada fase SDD se cargan al comenzar esa fase; infraestructura y despliegue requieren sus guías locales si llegan a formar parte del trabajo autorizado.

### Fuentes comprobadas

- [SidebarNav.tsx](../../../src/widgets/shell/SidebarNav.tsx): Reports pertenece al grupo Workspace y precede al de Administration.
- [package.json](../../../package.json): versiones declaradas y comandos nativos de validación.
- [Handler heredado de carga](/home/pablocristo/Proyectos/alphacoding/kma-backend/.worktrees/catalog-versioning/lambdas/catalog/internal/upload-catalog/handler.go), [caso de uso](/home/pablocristo/Proyectos/alphacoding/kma-backend/.worktrees/catalog-versioning/lambdas/catalog/internal/upload-catalog/usecases.go) y [repositorio](/home/pablocristo/Proyectos/alphacoding/kma-backend/.worktrees/catalog-versioning/lambdas/catalog/internal/upload-catalog/repository.go): contrato heredado y reemplazo anterior, conservados como referencia; el bootstrap nuevo utiliza manage-catalog y catalogimport.
- [Archivo original](/home/pablocristo/Proyectos/alphacoding/kma-backend/catalog-import.xlsx): SHA-256 comprobado nuevamente el 2026-10-21; coincide con el archivo validado previamente por el parser y el mapper reales; resultado temporal en `/tmp/kma-catalog-file-validation.json`: 1843 filas, 52 flows, cero errores o duplicados, ocho costos cero.
- AWS limita `BatchWriteItem` a 25 operaciones y documenta que el lote completo no es atómico; exige gestionar `UnprocessedItems`, por lo que los lotes solos no garantizan reemplazo completo. [Documentación de BatchWriteItem](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html).
- La lectura eventual puede omitir escrituras recientes; `ConsistentRead` está disponible para tablas e índices locales, no para índices globales, lo que debe considerarse al activar datos nuevos. [Consistencia de DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html).
- Lambda documenta 6 MB de petición síncrona; HTTP API, 10 MB de payload y 30 segundos de integración; el límite del archivo debe descontar base64, envoltorios y restricciones del BFF. [Cuotas de Lambda](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html), [cuotas de HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-quotas.html).

El diseño de versiones, activación condicional y recuperación es una propuesta derivada de estos límites y del código actual; no es una garantía de funcionamiento ya comprobada.

### Límites de esta entrega

La comprobación de este prompt es documental: no se ejecutó como tarea de implementación ni se evaluó con múltiples modelos; las pruebas del producto, el navegador y las operaciones de base de datos quedan para la implementación.

## Siguiente

Usar este prompt como entrada del trabajo de Catalog, resolver el contrato y el esquema de versiones contra el código, y realizar la implementación y su validación local en los worktrees indicados.
