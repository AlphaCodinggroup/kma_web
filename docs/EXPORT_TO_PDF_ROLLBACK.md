# TLDR
El PDF no se generaba desde el botón `Export to PDF` porque el frontend solo hacía polling a `GET /api/reports/{audit_id}` pero **no disparaba** la generación (que se dispara con `POST /api/audits-review/{audit_id}/complete-review`).

El fix reintroduce ese `POST` antes del polling. Si hay que volver atrás, es un revert simple del cambio en `AuditEditContent.tsx` + redeploy de Amplify (branch `develop`).

---

## Síntoma
- En DevTools → Network, al presionar `Export to PDF`:
  - No aparece `POST /api/audits-review/{audit_id}/complete-review`
  - Solo aparecen requests repetidos a `GET /api/reports/{audit_id}`
  - La respuesta se queda con `report_url: null` y nunca se abre el PDF.

## Causa raíz (flujo real del backend)
Para que exista un PDF, primero hay que **encolar** la generación en backend:

1) `POST /api/audits-review/{audit_id}/complete-review` (AuditsReview lambda)
- Actualiza `audits-review.status` a `final_report_sent_to_client`
- Encola un mensaje en SQS (`report-generation-queue`)
- Actualiza `audits.status` a `final_report_sent_to_client`

2) `ReportsWorker` (trigger SQS)
- Genera el PDF
- Sube el PDF a S3
- Escribe `audits.report_url` (y luego `GET /api/reports/{audit_id}` puede devolver un link presignado)

Si el frontend NO llama el paso 1, el paso 2 nunca ocurre y el polling no tiene forma de “magicamente” encontrar un PDF.

## Cambios aplicados

### Frontend (kma_web)
Archivo:
- `src/features/audits/ui/AuditEditContent.tsx`

Cambio:
- En `handleExport()` se reintrodujo el llamado a `complete-review` antes del polling:
  1) `await mutateAsync({ auditId: id })`
  2) `await refetchReviewDetail()`
  3) polling a `refetchReport()` (`GET /api/reports/{audit_id}`) hasta que exista `reportUrl`

Validación esperada:
- En Network aparece `POST /api/audits-review/{audit_id}/complete-review` (202)
- Luego aparecen `GET /api/reports/{audit_id}` hasta que vuelva con `report_url` y se abra el PDF.

### Backend (kma-backend) - ajuste de status code en GET report
Archivo:
- `kma-backend/lambdas/reports/internal/get-report/handler.go`

Motivo:
- Antes, `GET /api/reports/{id}` devolvía `202 Accepted` siempre que `report_url` estuviera vacío, incluso si el audit estaba en `draft_report_in_review` (o sea: ni siquiera se disparó la generación).

Cambio:
- `GET /api/reports/{id}` devuelve `202` solo cuando:
  - `report_url` todavía no está, y
  - `status` es `final_report_sent_to_client` o `completed` (generación/subida esperable “en progreso”).
- En estados previos (ej: `draft_report_in_review`) devuelve `200 OK` con `report_url: null` para evitar polling infinito basado en un `202` engañoso.

## Rollback (volver atrás)

### Rollback del Frontend (Amplify)
Revertir el cambio en `AuditEditContent.tsx` y redeployar el branch `develop`.

Opción A: revert por commit (recomendado)
1) Revert:
```bash
git revert <sha_del_commit>
git push origin develop
```
2) Esperar el build/deploy de Amplify para `develop`.

Opción B: revert manual (si no hay commit aún)
1) Volver a comentar/eliminar estas líneas de `handleExport()`:
- `await mutateAsync({ auditId: id })`
- `await refetchReviewDetail()`
2) Commit + push a `develop`.

Nota:
- Si el frontend vuelve atrás, el síntoma vuelve: no se llama `complete-review` y no se genera el PDF.

### Rollback del Backend (Reports lambda)
Solo si querés volver al comportamiento anterior del status code:
1) Revertir el cambio en:
- `kma-backend/lambdas/reports/internal/get-report/handler.go`
2) Redeploy de la lambda `Reports` (según el flujo que usen: SAM o update-function-code).

Nota:
- Este rollback no es necesario para arreglar el PDF; solo afecta el status code `200` vs `202` cuando `report_url` es null.

