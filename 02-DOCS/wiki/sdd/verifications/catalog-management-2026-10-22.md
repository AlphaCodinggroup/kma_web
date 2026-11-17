---
type: verification
status: verified-local-with-limitations
date: 2026-10-22
source_state: "web fda8e24e dirty; backend 2f2fef04 dirty"
---

# Catalog — entrega local

Implementación local completada en `new-ui` y `feat/catalog-versioning`, sin publicar Catalog ni cargar datos en AWS.
PR backend 104 comprobado nuevamente como MERGED, commit `2f2fef0458554623d956e1b3e84d402cce640501`.
La fecha corresponde al horario de Buenos Aires; los resultados HTTP guardan timestamps UTC del día siguiente.

## Comprobaciones vigentes

| Control | Resultado observado |
| --- | --- |
| Web, Node 22: `npm run lint` | 0 errores, 51 advertencias existentes; no se suprimieron reglas |
| Web: `npm run typecheck` | Aprobado |
| Web: `npm run test:run -- src/features/catalog src/widgets/shell app/api/catalog` | 9 archivos, 151 pruebas aprobadas |
| Go: `GOMAXPROCS=2 go test -mod=readonly -p 2 -race -count=1` en snapshot, catalogimport, catálogo común, Lambda catálogo completa, processor de enriquecimiento y generate-report | Aprobado; SDK real contra LocalStack con `CATALOG_TEST_DYNAMODB_ENDPOINT`, tablas UUID limpiadas por los tests |
| Go: `GOFMT_BASE=HEAD make fmt-check` y `go vet -p 2` en los paquetes afectados | Aprobados |
| `golangci-lint run --concurrency 2` en esos paquetes | 0 issues |
| `docker compose config --quiet` | Aprobado |
| `terraform -chdir=infra/terraform/modules fmt -check -recursive` | Aprobado |
| Dos HCL modificados | Terraform fmt -check sobre copias temporales `.tf`, aprobados; sustituye sólo formato/sintaxis, no ejecución Terragrunt |
| Drift de especificación, plan, progreso y prompt Catalog | Aprobado por documento |
| Drift global | Falló: 7 documentos stale y 22 enlaces rotos heredados de harness/rediseño y rutas relativas de worktree; no se corrigió documentación ajena |
| Diff de Catalog | Sin errores de whitespace; el diff global web denuncia CRLF en package.json y lock de la actualización previa, preservados |

Antes del último ajuste de Host y de los merges se observó `npm run verify` completo: 244 archivos y 3545 pruebas, compilación Next y cobertura 96,34% statements/lines, 93,04% branches, 94,43% functions.
Los ajustes posteriores quedaron cubiertos por los controles focalizados de esta tabla; no se presenta ese resultado anterior como una nueva corrida completa del estado final.
Las ejecuciones generales posteriores se interrumpieron: no se declara aprobado `make verify` completo ni una cobertura Go global final.
Se respetó la preferencia posterior de comprobaciones rápidas y reutilización de evidencia; no se rebajaron umbrales ni se activó CI_FULL.

## Recorrido real mediante Chrome DevTools MCP

1. Sesión admin verificada con Cognito mock; Catalog inmediatamente debajo de Reports.
2. Archivo original de 158.303 bytes, SHA-256 `2cc21a42e49f50a4fb92d2efc79ae2b4ccaea80dc5eafcede46fe047f78f6b33`, introducido en el input File del navegador y validado mediante el botón real.
3. Vista previa: 1843 registros, 52 flows, cero duplicados, muestra de 20; advertencia por cuatro filas excluidas de Pending variants y advertencia adicional porque el entorno mínimo no tiene definiciones de flows en esa región.
4. Confirmación y upload completados: operación `50955225-2d33-4b51-99aa-5399878b4328`, versión `a4df5e84-e928-4b03-b565-554d7e1fcb08`, revisión inicial `b28e80ae-a42f-4714-95ef-26bc481bba98`.
5. Restauración confirmada a legacy: recuperó el único registro sintético original y su costo cero; revisión `4fc4aee5-4b41-4327-b29b-4d8b54594dc6`.
6. Restauración confirmada a la versión importada: revisión nueva `cbd41ad4-de05-4b06-a750-6ce83a1e29fb`; GET existente devolvió 1843 ítems y ocho costos cero. Historial conserva ambas versiones.
7. Móvil oscuro 390×844: drawer muestra Reports → Catalog, sin desbordamiento horizontal; escritorio claro 1440×900 también sin desbordamiento.
8. Las seis rutas backend devolvieron 401 sin token y 403 al auditor mediante JWT firmado; BFF sin cookies devolvió 401; restauración con revisión obsoleta devolvió 409.

El tool upload_file no pudo acceder al archivo por su configuración de workspace; se transfirieron sus bytes autorizados al input File mediante DataTransfer en Chrome y se ejecutaron los botones reales, sin modificar la aplicación ni desactivar autenticación.
No se verificó el diálogo nativo del selector del sistema operativo.

## Medición y límite importante

| Petición | Resultado local |
| --- | --- |
| Validate referencia, navegador | 696 ms |
| Upload referencia, navegador/BFF | 10.059 ms, completado |
| Restauraciones, navegador/BFF | 338 y 347 ms, completadas |
| Validate máximo válido: exactamente 3 MiB, 10.000 registros, 7.960.746 bytes descomprimidos | HTTP 200, 1,829 s |
| Upload de ese máximo | Agotó presupuesto de 20 s: HTTP 500 a los 20,280 s, operación consultable como failed |

La operación máxima `5bbeb79a-fcc5-4f64-b198-9a4707e9714b` conserva versión/revisión activa anteriores sin cambios; la versión incompleta `814dd5fd-f169-4670-b105-3b28bdd7cb4b` no aparece en historial ni es restaurable.
No hay trabajo en segundo plano tras la respuesta.
El máximo de registros es un límite de validación, no una garantía de terminar bajo 20 segundos en este LocalStack; no se midió rendimiento AWS y no se aumentó silenciosamente el presupuesto ni los cuatro trabajadores acordados.
Proceso local tras el recorrido completo: VmHWM 184.236 KiB, VmRSS 67.996 KiB; máximos acumulados del proceso, no consumo exclusivo de una petición.

## Revisión independiente cerrada

- Correctness: metadatos ready y flow_count comprobados también en versiones nuevas; prefijo reservado limitado a claves, permitiendo texto libre legítimo.
- Tests: replay explícito tras 404 conserva UUID/revisión originales y reselección por nombre/SHA; nuevos casos de concurrencia real y respuesta SDK perdida tras commit.
- Security: JSON obligatorio y Origin contra Host público; rechazo previo de merges superpuestos con ocupación uint64 por fila y por hoja, además del presupuesto acumulado.
- El revisor de seguridad cerró el último finding de merges por inspección del estado actual, hash del parser `6ac00a6266aff4cdadc10cd5d6dcec6a3496467c8ac1151a0378a47636b0954f`; el integrador ejecutó la suite final con race.
- El revisor de tests aprobó los fixes y 97 pruebas focalizadas de Catalog/BFF antes de esta corrida ampliada de 151.

Las auditorías, QC e informes se cubrieron en los paquetes de lectores y casos de uso modificados; no se repitió un ciclo HTTP/PDF completo ni se inició el resto de las Lambdas del producto en el entorno mínimo.
Terragrunt no está instalado y no se validó contra estado remoto; no se ejecutó apply.

## Recursos y acceso local

Se mantiene el entorno de vista previa solicitado, separado de MEDM y sin arrancar las otras 14 Lambdas:

- Frontend `http://localhost:3001/catalog`, sesión exec `60054`, PID Next observado `2714160`; Node 22.
- Catálogo en 8081, sesión exec `5298`, PID observado `2707952`; endpoint DynamoDB localhost y tabla exclusiva `kma-catalog-local-20261021`.
- Compose proyecto `kma-catalog-acceptance`; contenedor `kma-localstack`, ID `9fb2dba1ce3538346435ee47964addfa528e85325cdea3441caea98993cd0ebf`.
- Cognito mock `kma-mock-cognito`, ID `6261dd2f4c86a6ede1a8039ee5ff0e3cc5e93e7a108ce911a7549c94c3295cd4`; volumen propio `kma-catalog-acceptance_cognito-data`.
- Usuario local `admin`, contraseña local `admin123`; sólo demo.

La web apunta directamente a `http://localhost:8081/api`; el proxy opcional 8082 documentado en el backend permite integrar el resto cuando el gateway completo esté activo.
Los PIDs identifican esta ejecución: comprobar propiedad, comando y puerto antes de detenerlos; no hacer limpieza por nombre, antigüedad ni prune global.
Las tablas efímeras SDK se eliminan al terminar los tests; los datos de demostración y el frontend quedan disponibles para Pablo.

## Publicación preparada

Lectores compatibles primero; gestor con bandera false y permisos después; habilitar sólo con todos los lectores preparados; interfaz al final.
Recuperación y compatibilidad de reversión de binarios en la [guía del backend](/home/pablocristo/Proyectos/alphacoding/kma-backend/.worktrees/catalog-versioning/docs/catalog-management.md).
Catalog permanece sin commit/push/deploy; la única fusión ejecutada fue el PR 104 autorizado.
