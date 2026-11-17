# Verificación del administrador de mitigaciones — 2026-10-23

## Estado y alcance

Implementación local sobre las ramas existentes, sin commits, publicación, merge ni despliegue. Backend base cc8b976 y frontend base 8b27268; los cambios descritos permanecen en el árbol de trabajo. CRUD afecta una sola fila; las versiones anteriores permanecen inmutables. Las rutas administrativas y el BFF conservan autorización, origen, límites e identidad de operaciones.

## Evidencia observada

- Backend: `go test ./lambdas/catalog/... ./internal/db/dynamo/catalogimport ./domain/catalog -count=1` y `go vet` con el mismo alcance: aprobados. Los SDK sin endpoint se omiten en esta ejecución; se ejecutaron explícitamente por separado contra LocalStack en 127.0.0.1:4566.
- LocalStack: `CATALOG_TEST_DYNAMODB_ENDPOINT=http://127.0.0.1:4566 go test ./lambdas/catalog/internal/manage-catalog -run TestSDKMutationExportRoundTrip -count=1 -v`: referencia de 1843 registros, export/reimport completo, alta/edición/borrado, historial y repetición completada aprobados (182,94 s). Máximo falló durante el import preexistente por deadline de 160 s bajo carga concurrente; no se atribuye aprobación a ese intento.
- Repetición focalizada sin los controles web concurrentes: mismo paquete, `-run TestSDKMutationExportRoundTrip/maximum -timeout 20m`: aprobada en 161,88 s totales, import inicial 75,63 s; 10000 registros, export/reimport de todos los campos, una actualización completa, historial, repetición y persistencia del comando. Alta y borrado se cubrieron en referencia y pruebas focalizadas, no se repitieron sobre máximo.
- La lectura completa se optimizó posteriormente para resolver una sola vez versión/manifiesto. Su prueba de paginación y la suite Go afectada pasaron. Los binarios recompilados se comprobaron contra LocalStack a través del BFF: export de 10000 registros HTTP 200, 383453 bytes, MIME XLSX, 2,7 s (antes: 11 s); edición y borrado reales de la referencia mediante la nueva lectura.
- Regresión Excel: 32767 caracteres conservados y 32768 rechazados antes de truncarse. Textos se escriben como literales; costo cero y ausente se conservan.
- Frontend: `npm run lint`, `npm run typecheck`, `npm run test:coverage` y `npm run build`: aprobados; 248 archivos, 3580 pruebas, cobertura 96,32% líneas/sentencias, 92,59% ramas y 93,18% funciones. Sin reducir umbrales. Logs locales: /tmp/kma-mitigations-fe-coverage.log y /tmp/kma-mitigations-fe-build.log.
- Se excluyó `.worktrees/**` de ESLint: el primer lint recorrió checkouts ajenos y falló; el control nativo final pasó con el alcance correcto.
- Infraestructura: `sam validate --lint --region us-east-1`, formato de módulos Terraform y control HCL del archivo modificado: aprobados. Terragrunt no está instalado; se usó el parser/formato HCL de Terraform, sin plan cloud.
- `GOFMT_BASE=HEAD make fmt-check` y `git diff --check` en ambos repositorios: aprobados. El fmt-check predeterminado compara contra main y detecta archivos preexistentes ajenos al cambio; no se reformatearon.

## Navegador real

Chrome DevTools, contexto aislado codex-mitigation-crud-20261023, http://localhost:3001/catalog, API 8086/worker 8085 y tabla/bucket/cola propios kma-catalog-complete-20261023. Login administrativo local verificado. Alta CRUDTEST/B1/Q1 con costo cero; edición de clave a Q2 y texto; limpieza mediante teclado del costo a null; borrado con confirmación. Operaciones completadas, URL actualizada y registro ausente después de borrar. Export mediante botón con filtro CRUDTEST activo, sin errores. Móvil 390x844: sin desborde horizontal, modal desplazable y foco accesible; escritorio 1440x1000. Consola sin warnings ni errores. Se restauró al finalizar la versión original del preview de 10000 registros, conservando su historial. Las pruebas SDK limpiaron sus recursos efímeros; los procesos propios de preview continúan desde los checkouts originales.

## Revisión y límites

Revisión independiente backend y frontend: corregidos truncamiento Excel y mensajes de errores JSON recibidos como Blob en export. Lectura final de la optimización y verificación real completadas por el agente principal. No se validó AWS desplegado ni móvil de campo, cuyos contratos no se modificaron.

En la verificación inicial, `drift check` global falló por enlaces/rutas preexistentes: backend 23 enlaces rotos y 11 documentos obsoletos; frontend 21 enlaces rotos y 6 documentos obsoletos. Las nuevas secciones de plan/spec y este documento no introducen enlaces rotos. No se acredita el gate global como aprobado ni se amplía la tarea a reparar documentación ajena.

Actualización QA: los enlaces documentales se repararon y Drift global quedó en verde. Véase [QA final](mitigation-qa-2026-10-23.md).
