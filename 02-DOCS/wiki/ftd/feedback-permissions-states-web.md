---
type: delivery
status: integration-review
branch: fix/feedback-permissions-states
---
# Permisos y reapertura en la consola

## Alcance y aceptación

Tareas 1/2/7: auditor propietario abre/edita durante revisión; aprobación y reapertura de Completed solo admin. Flows oculto y ruta protegida para no-admin. No cambiar móvil ni edición de campos/flows de Oski. El backend valida identidad y propiedad; la pantalla solo presenta capacidades.

## Plan

- [x] Reproducir bloqueo de edición propia.
- [x] Propagar createdBy del detalle; separar editar/aprobar; proteger consola Flows.
- [x] Integrar prop editable de preguntas tras checkpoint del agente UNSURE.
- [x] Reabrir Completed vía estado existente; descartar cache de PDF anterior y regenerar.
- [x] Pruebas afectadas, lint, tipos y build; evidencia registrada.

## Evidencia

Base fa8721b. UNSURE d99839e2 integrado mediante cherry-pick 00aa9ff antes de propagar editable. Reproducción: propietario bloqueado en editor/tabla; corregido con 323 pruebas focalizadas verdes y typecheck verde. Logs /tmp/kma-permissions-web-repro-valid.log y /tmp/kma-permissions-web-final.log. Dependencias instaladas con npm ci --ignore-scripts, sin cambiar lockfile. Catálogos compartidos quedan reservados al agente de integración.

## Siguiente

Recorrido integrado y nueve criterios funcionales aprobados. Conservar los recibos y límites del cierre conjunto; no se publica ni despliega.


### Reapertura y evidencia final

Reopen review aparece solo para admin y Completed. No añade retorno a pending. PATCH status solicita draft_report_in_review; tras éxito se cancela y elimina cache del reporte de esa auditoría, se refrescan listas/detalles y se reinicia la sesión de aprobación. Un fallo conserva el PDF vigente y muestra error. Durante transición no se descarga ni repite la reapertura. Las otras auditorías conservan el snapshot anterior hasta la siguiente generación consolidada.

Download requiere estado reportado, por lo que una URL cacheada en revisión no habilita la descarga. El exportador tampoco considera listo un reporte en revisión con una URL vieja: ejecuta complete-review para generar de nuevo. La autorización reside en backend; ninguna vista previa sustituye el control de rol/propiedad.

Repro /tmp/kma-reopen-web-repro.log: fallaban botón ausente, descarga cacheada y omisión de generación. Tras cambio: 79 pruebas en AuditEditContent, ReportActionBar, useExportAuditReport y useUpdateAuditReviewStatus (/tmp/kma-reopen-web-first.log). Pruebas de permisos previas: 323 en ocho archivos (/tmp/kma-permissions-web-final.log). npm run typecheck, npm run lint y npm run build terminaron sin error (/tmp/kma-reopen-web-types.log, /tmp/kma-reopen-web-lint.log, /tmp/kma-permissions-web-build.log). No se ejecutó navegador ni AWS.

Revisión independiente #1/#2 aprobada sin defectos funcionales. Matiz de formato: audit-detail.ts y AuditEditContent.test.tsx ya usan CRLF; se preservó su formato. git diff --check normal marca los CR como espacios finales; git -c core.whitespace=cr-at-eol diff --check 00aa9ff f138e97 pasó. La comprobación del rango final usará la misma opción, sin normalizar archivos ajenos. Catálogos reservados a integración.

## Integración del 2026-11-17


Unidad aprobada independientemente e incorporada con UNSURE e integridad de
reportes al web `0f81ef1` y backend `2aa7ffb1`. El gate web pasó: lint, tipos,
3653 pruebas en 254 archivos, cobertura superior a los pisos de 90% y build.
QA de navegador confirmó edición/guardado del propietario, ausencia de edición
para ajeno, Flows oculto y ruta administrativa protegida. Las mutaciones y
aprobación fueron verificadas contra el backend; la UI no sustituye ese control.

El primer PDF real, consolidado de dos instalaciones, fue inspeccionado junto a
la vista previa. Completed→reapertura→edición→regeneración pasó en navegador: la medida cambia
de 0 a 7.25, conserva 34, excluye las fotos elegidas y genera un PDF nuevo en
la misma clave S3. Los nueve criterios funcionales tienen PASS; los límites
heredados del gate backend permanecen explícitos en el registro conjunto. Los originales
no se modificaron. Ver el
[registro conjunto](../../../../kma-backend/02-DOCS/wiki/ftd/feedback-integration.md)
para la evidencia local, los límites heredados del gate backend y el cierre
coordinado. No se verificó AWS ni se publicó o desplegó.
