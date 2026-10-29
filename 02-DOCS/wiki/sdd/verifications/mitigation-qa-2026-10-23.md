# QA del administrador de mitigaciones — 2026-10-23

## Veredicto

**PASS para el alcance del administrador en el entorno local.** Se ejecutaron controles sobre los cambios sin publicar, fusionar ni desplegar. Backend: rama feat/catalog-complete, base cc8b976. Frontend: rama fix/frontend-startup-warnings, base 8b27268. Los cambios y las pruebas quedan sin commit en los checkouts originales.

## Skills aplicadas

QA Test Planner, E2E Testing, Webapp Testing, Browser Debugging, Accessibility, Testing Go, Testing Web, Verify, Debug y Drift, además de las guías KMA de validación local y contratos. Se utilizaron las herramientas nativas del proyecto, Chromium real y Chrome DevTools en un contexto aislado.

## Casos y resultados

| Caso | Resultado observado | Evidencia |
| --- | --- | --- |
| QA-01 Importar | La validación no cambia el activo; importar referencia crea versión completa de 1843 registros | E2E final |
| QA-02 CRUD independiente | Dos filas con el mismo código de mitigación; editar una conserva la otra; cambio de clave; costo cero frente a vacío | E2E final y SDK |
| QA-03 Exportar | Descargar con filtro de dos filas exporta los 1845 registros; el import valida el XLSX descargado | E2E final |
| QA-04 Conflicto e historial | Revisión obsoleta devuelve 409, conserva el formulario y ofrece revisar; versión histórica impide editar | E2E final |
| QA-05 Recuperar | Recargar después de aceptar la operación conserva seguimiento y resultado; cancelar borrado conserva la fila; confirmar la elimina | E2E final |
| QA-06 Permisos | 401 sin sesión; 403 auditor; 403 origen ajeno; 400 JSON inválido/costo negativo; revisión intacta | E2E final y contratos |
| QA-07 Accesibilidad | axe WCAG 2/2.1/2.2 A/AA sin violaciones en escritorio1440 y móvil390; foco contenido, Escape y retorno al botón; sin desborde | E2E final |
| QA-08 Concurrencia | Pérdida de envío, reinicio y propiedad vencida; comando persistido; dueño viejo bloqueado; duplicados sin reactivación; un ganador y un conflicto | SDK con detector de carreras |
| QA-09 Lectura completa | Páginas DynamoDB reales superiores a1MiB, export completo y costos cero/ausentes preservados | SDK del lector optimizado |
| QA-10 Descarga protegida | Rechaza MIME incorrecto, tamaño excesivo/falso, stream cortado, cuerpo truncado y HTTP206; conserva JSON de errores y admite gzip válido | Pruebas del proxy |
| QA-11 Calidad | Lint, tipos, cobertura, build, lint/vet/race Go, formato nativo de la rama y Drift aprobados | Controles descritos abajo |

## Hallazgos corregidos

1. El proxy binario aceptaba HTTP206 como descarga completa. Reproducido con una prueba roja; ahora exige HTTP200 y rechaza respuestas parciales.
2. El proxy aceptaba un cuerpo más corto que Content-Length. Reproducido con una prueba roja; ahora compara el tamaño real sin codificación, conserva el límite de bytes y contempla la descompresión de fetch. Pruebas rojas iniciales: dos fallos, ocho casos verdes.
3. Golangci-lint detectó el error de cierre no tratado en el generador XLSX. Se explicitó el descarte del cierre de recursos temporales, coherente con el parser, y se volvió a comprobar la exportación.

La primera ejecución E2E tuvo dos casos aprobados y un fallo del propio helper: usaba la respuesta202 en lugar del resultado completado para navegar a una versión. Se corrigió el helper sin relajar la aserción histórica. La ejecución final de los tres casos pasó.

## Controles ejecutados

### Frontend

- `npm run verify`, con Node22 y un máximo de dos workers Vitest: salida0; incluye lint sin warnings, tipos, cobertura y build sobre archivos estables.
- 249 archivos y **3602 pruebas aprobadas**. Cobertura: 96,41% líneas/sentencias, 92,86% ramas y 93,55% funciones; umbrales90% conservados.
- `E2E_BASE_URL=http://localhost:3001 CATALOG_E2E_MUTATIONS=1 node node_modules/@playwright/test/cli.js test e2e/catalog.spec.ts --workers=1 --output=/tmp/kma-mitigation-qa-playwright-final`: **3 aprobadas**, 2,7min; mismo Node22 del preview.
- Validador de la skill E2E sobre copias idénticas del spec/config en /tmp/kma-mitigation-qa-static: dos archivos limpios, trace/retries presentes, sin patrones prohibidos.
- Logs locales: /tmp/kma-mitigation-qa-verify.log, /tmp/kma-mitigation-qa-e2e-final.log y /tmp/kma-fe-qa-final-focused.log. El último corresponde a83 pruebas focalizadas anteriores al gate completo.

### Backend

- `GOMAXPROCS=2 CATALOG_TEST_DYNAMODB_ENDPOINT=http://127.0.0.1:4566 go test -race -p 2 ./lambdas/catalog/internal/manage-catalog ./internal/db/dynamo/catalogimport ./lambdas/catalog/cmd/bootstrap -run 'TestMutation|TestSDKMutationQA|TestAsyncImport|TestReadSnapshot|Test.*Batch|TestManagementRoutes' -count=1 -timeout=5m`: PASS, 20,209s/1,099s/1,195s por paquete; sesión60532.
- `GOMAXPROCS=2 golangci-lint run --concurrency 2 ./lambdas/catalog/... ./internal/db/dynamo/catalogimport/... ./domain/catalog/...`: **0 issues**, sesión12900.
- `GOMAXPROCS=2 go vet -p 2 ./lambdas/catalog/... ./internal/db/dynamo/catalogimport ./domain/catalog`: salida0, sesión86219.
- `GOMAXPROCS=2 go test -p 2 ./lambdas/catalog/internal/manage-catalog/boundedexcel -run 'TestExportReferenceRoundTrip|TestExportRejectsSilentCellTruncation' -count=1`: PASS, 2,058s, sesión35942.
- `make fmt-check` sin cambiar su base y `git diff --check`: aprobados. El control nativo detectó19 archivos Go previos sin formato; se aplicó únicamente gofmt. Se compararon los tokens del AST canónico antes/después, ordenando imports: idénticos en los19 archivos. El comprobador auxiliar detecta además un cambio de literal1→2, para comprobar que no acepta modificaciones de lógica. Copias previas y comprobador en /tmp/kma-mitigation-qa-format.
- Se conserva la evidencia anterior de1843/10000 filas; no se repitió esa carga costosa por rutina. La nueva prueba SDK acredita el lector optimizado final con varias páginas reales y recursos propios.

### Documentación

Se repararon44 enlaces rotos y referencias obsoletas sin desactivar controles ni restampar anclas a ciegas. `drift check` global pasó en ambos repositorios; `git diff --check` también.

## Navegador y recursos

Se recompilaron API y worker desde el código final y se reinició el frontend tras su build, conservando las configuraciones existentes. Puertos3001/8086/8085, proxy8083 y recursos propios kma-catalog-complete-20261023; propiedad/PID registrados en /tmp/kma-catalog-complete-resources.json. E2E exige habilitación explícita y URL local, y restaura la versión activa original en finally. Las tablas/buckets/colas efímeras SDK se limpiaron. Los procesos durables del preview quedan funcionando.

Chrome DevTools adicional: contexto kma-mitigation-qa-20261023, tema oscuro, móvil390x844, modal desplazable356px, foco dentro y Escape; comprobación a200% sin desborde horizontal. Consola sin warnings ni errores. No se escribieron registros desde esta exploración adicional.

## Límites de la evidencia

No se ejecutaron producción/AWS, Firefox/WebKit ni un lector de pantalla externo. Axe y teclado no equivalen a una certificación WCAG completa. Tampoco se ejecutaron las suites globales de módulos backend ajenos al catálogo; sí los controles focalizados y el gate completo frontend. El control nativo de formato contra main también pasó después de la higiene mecánica.
