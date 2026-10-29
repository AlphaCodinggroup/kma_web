# Features (`src/features`)

Los recuentos por área de esta página corresponden al escaneo original del
23/10/2026. El [registro consolidado](changes-2026-10-29.md) reúne las
correcciones posteriores, la última verificación y el estado publicado.

Estructura común: `api/` (implementación del puerto, que vive en `src/entities/*/api`), `lib/` (usecases y
hooks de React Query) y `ui/`. Los tests viven en `__tests__` junto al código (249 archivos de test en
`src/` y `app/`). Estado de servidor: React Query; formularios: `useState` a mano salvo `LoginForm`
(react-hook-form + zod). Rutas BFF y endpoints: [routes-and-bff.md](routes-and-bff.md). Reglas de contrato y
desajustes: [contexto del proyecto](../../../docs/agents/project-context.md#domain-and-contracts).

## audits (49 tests)

| Aspecto | Detalle (CONFIRMADO salvo nota) |
| --- | --- |
| Responsabilidad | Listado y filtros de auditorías, envío a revisión, edición QC de hallazgos y respuestas, comentarios, aprobación y exportación del informe |
| UI clave | [`AuditsTable`](../../../src/features/audits/ui/AuditsTable.tsx), [`AuditEditContent`](../../../src/features/audits/ui/AuditEditContent.tsx), [`ReportPreview`](../../../src/features/audits/ui/ReportPreview.tsx), [`AuditQuestionCard`](../../../src/features/audits/ui/AuditQuestionCard.tsx) (763 líneas), `CommentsSidebar`, `ExportReportModal`, `NoReportNeededModal` |
| Hooks clave | `useInfiniteAudits`, `useProjectAudits`, `useAuditDetail`, `useOpenAuditReview`, `useReportDrafts` (PATCH secuencial por hallazgo), `useUpdateAuditFindingMutation`, `useCompleteReviewAuditMutation`, `useExportAuditReport` (sondea el informe), `usePoollAuditReview`, comentarios (`useAuditComments` y mutaciones) |
| Usecases | `listAudits`, `getAuditById`, `deleteAudit`, `send-for-review`, `updateAuditAnswer`, `updateAuditFinding`, `completeReviewAudit`, `updateAuditReviewStatus`, comentarios |
| Contrato | `/api/audits*`, `/api/audits-review/*`, `/api/comments*` (tabla de rutas); estados en `entities/audit` (4 de los 5 del backend) |
| Guardas | [`audit-edit-href.ts`](../../../src/features/audits/lib/audit-edit-href.ts) `isAllowedReturnPath` (anti open redirect); edición solo `isAdmin` y `draft_report_in_review` |
| Dependencias cruzadas | importa `reports`, `flows`, `users` (violación conocida) |

## auth (3 tests)

[`LoginForm`](../../../src/features/auth/ui/LoginForm.tsx), usecases `login`/`logout`
([`login.ts`](../../../src/features/auth/lib/usecases/login.ts)), y [`cognito.repo.impl.ts`](../../../src/features/auth/api/cognito.repo.impl.ts)
(llamadas HTTP directas a Cognito: `InitiateAuth` con `USER_PASSWORD_AUTH` y `REFRESH_TOKEN_AUTH`,
`GlobalSignOut`). Detalle en [auth-and-session.md](auth-and-session.md).

## catalog (integrado y desplegado en Dev)

| Aspecto | Detalle |
| --- | --- |
| Prioridad visual | Upload XLSX aparece primero, seguido por la validación y después la consulta e historial; [verificación](../ftd/catalog-upload-first.md) |
| Responsabilidad | Administración del catálogo de mitigaciones: estado, versiones históricas, navegación de ítems con filtros en URL (`version`, `q`, `flow_id`, `barrier_id`, `cursor`), validar/subir/activar XLSX, importaciones en segundo plano (operaciones), CRUD de ítems, exportación XLSX |
| UI | [`CatalogManager`](../../../src/features/catalog/ui/CatalogManager.tsx), [`CatalogBrowser`](../../../src/features/catalog/ui/CatalogBrowser.tsx), [`CatalogItemEditor`](../../../src/features/catalog/ui/CatalogItemEditor.tsx) |
| Lógica | [`useCatalogManager`](../../../src/features/catalog/lib/hooks/useCatalogManager.ts) (claves `["catalog", "status" \| "versions" \| "operations" \| "items"]`); [`validate-catalog.ts`](../../../src/features/catalog/lib/usecases/validate-catalog.ts) (XLSX <= 3 MiB, base64, SHA-256 local) |
| API | [`catalog.repo.impl.ts`](../../../src/features/catalog/api/catalog.repo.impl.ts) sobre `/api/catalog/*`; `catalog-error.ts` normaliza errores; modelo en `entities/catalog/model` |
| Acceso | solo administradores (página y BFF) |
| Estado | Integrado en `new-ui` mediante #78/#80 y publicado en Amplify. Backend Dev actualizado con catálogo y worker. [Registro consolidado](changes-2026-10-29.md) y [ambientes](environments.md). Especificación: [catalog-management](../sdd/specs/catalog-management.md) |

## dashboard (3 tests)

[`useDashboardSummary`](../../../src/features/dashboard/ui/useDashboardSummary.ts) + usecase
`get-dashboard-summary` sobre `GET /api/dashboard`. La página [`dashboard/page.tsx`](../../../app/(dashboard)/dashboard/page.tsx)
compone los widgets de [`src/widgets/dashboard`](../../../src/widgets/dashboard) (`DashboardMetrics`, `MetricCard`,
`ReviewPipeline`, `DashboardActivitySection`, `ActivityItem`). Sin series históricas (ver [`PRODUCT.md`](../../../PRODUCT.md)).

## facilities (9 tests)

CRUD, archivar/restaurar y subida de imagen. UI: `FacilitiesContent`, `FacilityTable`,
`FacilityUpsertDialog`/`Create…`/`Edit…`. Hooks de mutación y `useFacilitiesQuery`,
`useProjectFacilitiesQuery`. Repo [`facilities.repo.impl.ts`](../../../src/features/facilities/api/facilities.repo.impl.ts):
`/api/facilities*`, `/api/projects/{id}/facilities`, `/api/facilities/upload-img` y subida vía
`/api/uploads/proxy`. Acciones deshabilitadas a no admin (solo UI). `buildFacilityOptionalFields` evita
inventar campos ausentes.

## flows (14 tests)

| Aspecto | Detalle |
| --- | --- |
| Responsabilidad | Listar flows y editar su estructura de pasos (Question, Form, Select, End), navegación condicional, imágenes y campos de formulario |
| UI | [`FlowEditor`](../../../src/features/flows/ui/FlowEditor.tsx) (1062 líneas), `FlowStepsTable`, [`StepDetailInspector`](../../../src/features/flows/ui/StepDetailInspector.tsx), `StepSelector`, `ConditionalNavEditor`, `FlowCard`, `FlowQuestionsDialog`; adapters en `ui/adapters` |
| Datos | [`flows.repo.impl.ts`](../../../src/features/flows/api/flows.repo.impl.ts) (`/api/flows`, `/summary`, `/{id}`; imágenes por `/api/uploads/presigned` y `/api/uploads/proxy`), [`flows.dto.ts`](../../../src/features/flows/api/flows.dto.ts), `useFlowsQuery`/`useFlowById`; modelo en [`entities/flow/model.ts`](../../../src/entities/flow/model.ts) |
| Roles | edición y borrado de pasos solo con `isAdmin`; el resto ve el flow en solo lectura (UI) |
| Notas | `app_example.md` y `flow_example.json` en `ui/` son ejemplos, no código. Ancho del inspector: [flow-inspector-width](../ftd/flow-inspector-width.md). Los `FIXME` de tests documentan fallos conocidos al borrar o renombrar pasos |

## projects (19 tests)

CRUD, archivo/restauración y listados (pestañas Projects/Facilities en `/projects`). UI:
`ProjectsContent`, `ProjectsTable`, `ArchivedProjectsTable`, `ProjectsUpsertDialog`,
`ProjectAuditsProgress`. Repo [`projects.repo.impl.ts`](../../../src/features/projects/api/projects.repo.impl.ts)
sobre `/api/projects*`. `project-href.ts` y `buildProjectOptionalFields` en `lib`. El detalle
(`/projects/[id]`) vive en el widget [`project-detail`](../../../src/widgets/project-detail). El backend
ignora `code` y `status` en create/update (ver contexto).

## reports (11 tests)

Listado de informes y descarga. UI: `ReportsTable`, `ReportsListCard`, `ReportsSearchCard`. Hooks:
`useReportsListQuery` (en `useReportsQuery.ts`), `useAuditReport`, `usePollAuditReport`,
`useDownloadReportFile`, `useDeleteReport` (bug conocido de clave de invalidación, ver contexto). Repos:
`reports.repo.impl.ts` (`/api/reports`) y `audit-report.repo.impl.ts` (`/api/reports/{id}`). La vista previa
QC replica el PDF con [`report-format.ts`](../../../src/shared/lib/report-format.ts); descarga en
[`download.ts`](../../../src/shared/lib/download.ts). Reglas: [report rules](../../../docs/agents/project-context.md#report-rules).

## users (6 tests)

`UsersTable`, `UsersMetrics`, `UsersSearchCard`, `CreateUserDialog`, hook `useUsersQuery`; repo
[`users.repo.impl.ts`](../../../src/features/users/api/users.repo.impl.ts) (`/api/users`, el PATCH del BFF
pasa a PUT en el backend). La página de usuarios no comprueba rol en servidor (INFERIDO: la barrera es el
authorizer del backend; NO VERIFICADO).

## Comentarios

No hay feature `comments` propia: viven en `audits` ([`audit-comments.repo.impl.ts`](../../../src/features/audits/api/audit-comments.repo.impl.ts),
`CommentsSidebar`, hooks de comentarios) sobre `/api/comments*`; comentar exige `isAdmin` (UI).
