---
type: progress
status: verified-local-with-limitations
date: 2026-10-21
---

# Progreso de Catalog

## T0 — resolución y base

PR 104 fusionado por squash, sin borrar ramas ni worktrees; estado remoto MERGED, commit `2f2fef0458554623d956e1b3e84d402cce640501`.
La base de Catalog incorpora la unificación Go ya presente en main; se usarán las rutas actuales `pkg` y `internal/db/dynamo`, sin repetir la migración.
Pruebas previas de users con race, vet y compilación aprobadas sobre el SHA revisado.

## Análisis previo

Especificación y plan corresponden al pedido aprobado; las seis APIs y las claves de snapshot están congeladas antes de delegar. El esquema no requiere tabla nueva; lectores, rutas y permisos deben cambiar juntos. Autorización externa limitada a PR 104; Catalog queda local.

## T1–T3 — almacenamiento y lectores implementados

- Helper `internal/db/dynamo/catalogsnapshot`: puntero consistente, contexto fijado por tabla, claves lógicas, manifiestos paginados y verificación de ready/cantidad de flows; legado sin marcador completo vuelve a consultar únicamente filas heredadas.
- `domain/catalog/management.go`, `internal/db/dynamo/catalogimport` y `lambdas/catalog/internal/manage-catalog`: validación previa sin escrituras, versiones inmutables, lotes con cuatro trabajadores, transacciones condicionales, presupuesto de 20 segundos, resultado idempotente, historial y restauración.
- Parser acotado sobre el parser y mapper existentes: límites ZIP/XML/celdas/rangos, costos cero, rechazo de duplicados y advertencias explícitas; no se inventaron equivalencias de flows.
- `internal/db/dynamo/catalog/repository.go`, enriquecimiento e informes: snapshot único durante toda la operación, incluidas páginas y alternativas; errores de catálogo impiden generar un informe enriquecido parcialmente.
- Bootstrap y configuración del catálogo cableados al gestor nuevo; el ReplaceAll heredado permanece sin uso en la ruta de upload.

Pruebas observadas: paquetes modificados con `-race` aprobaron, incluida integración SDK con LocalStack y tablas UUID; referencia 1843 filas/52 flows/8 ceros; validación sin escrituras, fallo de staging, reintentos, cancelación y replay cubiertos por pruebas específicas.

## T4 — interfaz implementada

Página `/catalog`, entidades, repositorio, casos de uso, hook y componente propios; BFF `/api/catalog/[...path]` con sesión administrativa verificada, proxy compartido, esquemas estrictos y lectura acotada del cuerpo real.
SidebarNav muestra Catalog inmediatamente debajo de Reports para admin; breadcrumbs y navegación móvil conservan los componentes existentes.
Selector manual, resumen, advertencias, muestra limitada, confirmaciones, resultado, historial paginado y restauración.
Una operación incierta persiste sólo metadata: consultar estado; ante 404, reintento explícito con UUID y revisión originales; upload exige reseleccionar mismo nombre y SHA-256, sin guardar bytes del Excel en sessionStorage.

`npm run verify` con Node 22 sobre los ajustes de recuperación aprobó 244 archivos y 3545 pruebas, con cobertura 96,34% statements/lines, 93,04% branches y 94,43% functions, más compilación Next; pendiente repetir tras corregir comparación de Host descubierta en navegador.

## T5 — infraestructura y recuperación preparadas

Rutas de gateway en Terragrunt, bandera deshabilitada por defecto AWS, permisos transaccionales subyacentes/ConditionCheckItem y lectura de flows; Compose local habilita gestión.
Guía operativa: `docs/catalog-management.md` del backend; conserva publicación por etapas y advierte que restaurar datos no vuelve compatibles los binarios antiguos.
`docker compose config --quiet` aprobado; Terraform fmt de módulos aprobado; Terragrunt no está instalado, se formatearon únicamente los dos HCL modificados mediante terraform fmt sobre copias temporales `.tf`; esto no valida dependencias ni estado remoto.
No se ejecutó apply ni despliegue.

## Revisión adversarial y correcciones

- Integridad: el lector nuevo no comparaba flow_count del manifiesto; regresiones rojas y corrección fail closed para metadatos ausentes/staging/manifiesto parcial, conservando legacy.
- Validación: se rechazaba texto libre con prefijo reservado; se restringió la reserva a claves reales con pruebas positivas y negativas.
- Expansión Excel: presupuesto acumulado de 640.000 celdas combinadas antes de Excelize, contando duplicados/solapamientos; prueba adversarial rápida.
- Seguridad: un JSON text/plain desde otro Origin alcanzaba el proxy bajo SameSite=None; ahora JSON obligatorio y Origin coincidente, con tres regresiones rojas y verdes; el navegador reveló además Host público distinto del bind interno de Next, agregado como regresión.
- Recuperación: GET 404 de un POST nunca recibido bloqueaba la UI permanentemente; ahora conserva identidad y ofrece replay explícito seguro tras remontaje.
- Concurrencia: la suite original dejaba pasar un mutante que eliminaba CAS; se incorporó `TestSDKConcurrentRevisionGuard` con barrera real: código correcto 1 completed/1 conflict, mutante 2 completed/0 conflict y prueba fallida.
- Respuesta perdida: `TestSDKLostActivationResponseReconcilesAndReplays` aplica la transacción SDK y devuelve error sintético; resultado completado recuperado y replay posterior sin reactivar versión vieja, aprobado con race.

## Mediciones locales iniciales

Tabla de demostración exclusiva `kma-catalog-local-20261021`, endpoint 127.0.0.1:4566; identidad Cognito mock, sin AWS.
Referencia SHA-256 `2cc21a42e49f50a4fb92d2efc79ae2b4ccaea80dc5eafcede46fe047f78f6b33`: validate HTTP 200, 1843 registros/52 flows, 1,224 s.
Archivo sintético válido de exactamente 3.145.728 bytes, 8.026.087 bytes descomprimidos y 10.000 registros: validate HTTP 200 en 4,060 s.
Proceso Go local después de ambas validaciones: VmHWM 171.500 KiB; medición del proceso acumulada, no atribución exclusiva a una llamada ni predicción de Lambda.
Resultados temporales `/tmp/kma-catalog-local-measurements.json`; todavía falta medición de upload y recorrido de restauración.

## Comprobaciones finales en curso

La primera ejecución de make verify detectó formato respecto de un main local anterior a la base fusionada y errores de lint del código nuevo; se corrigieron estos últimos, incluidos Close explícitos y helpers sin uso.
Se eliminó también el helper ptr sin uso del test de GET catalog para permitir lint sobre el módulo unificado; no cambia comportamiento.
Se usa `GOFMT_BASE=HEAD` y `GO_MODULE_DIRS='. local/runtime'` en make verify porque son los dos módulos actuales, evitando ejecutar otra vez cada Lambda ya incluida en el módulo raíz.
No se rebajaron umbrales ni se omitieron pruebas SDK por falta de endpoint.
El resultado final y las limitaciones del recorrido de navegador se completarán aquí antes de cerrar la entrega.


## Cierre local — 2026-10-22

La implementación y el recorrido de carga/restauración están completados; evidencia consolidada en [verificación local](../verifications/catalog-management-2026-10-22.md).
Última corrida focalizada: 151 pruebas web, lint y tipos aprobados; Go afectado con race+SDK, vet, gofmt y golangci-lint aprobados (0 issues).
Seguridad cerró también la variante de expansión por envolventes: ahora se rechazan todos los merges solapados antes de Excelize; se conservan adyacencias y rangos iguales en hojas distintas.
El navegador confirmó importación de 1843 ítems, restauración legacy y vuelta a la versión importada con revisión nueva; lectura final conserva ocho costos cero, historial completo y permisos HTTP reales.
El máximo válido de 10.000 filas y 3 MiB valida, pero su upload local agotó los 20 segundos: estado failed registrado, puntero anterior conservado y versión incompleta excluida del historial; es una limitación medida, no una prueba de capacidad AWS.
Drift global falla por 7 documentos stale/22 enlaces heredados; los documentos Catalog pasan en modo focalizado; Terragrunt ausente, sin apply ni validación remota.
Las suites generales interrumpidas no se presentan como aprobadas; se reutilizó el npm verify anterior y se verificaron los cambios posteriores con checks focalizados, respetando la preferencia explícita de coste.
Vista previa mínima disponible en localhost:3001/catalog, usando directamente la Lambda 8081 y el proyecto Compose propio kma-catalog-acceptance; el resto de APIs del producto no se levantó en esta última ejecución.
No se publicaron ramas Catalog; no se cambiaron datos AWS ni archivos de MEDM.

## 2026-10-23 — ampliación en implementación
Plan del chat aprobado explícitamente. Worktrees aislados: FE frontend-startup-warnings-pr y BE catalog-complete desde origin/main9632a123. Catalog local copiado sin conflictos; originales preservados. Skills implement y contratos cargadas; ejecución automática y TDD estricto según config. Equipos: Go, FE e infraestructura, archivos disjuntos. Evidencia pendiente; ninguna tarea nueva marcada completada.

## Cierre de implementación — 2026-10-23
BE, FE e infraestructura completos. Evidencia consolidada en [verificación](../verifications/catalog-management-2026-10-23.md). Nativas FE3571pruebas/cobertura/build y GoSDK/racefocalizado/vet/lint0issues; revisoressecurity/correctness/tests cerraron hallazgos. Browser validó carga máxima completada altercerintento, recuperación tras cerrar pestaña, consulta de10000registros, búsquedaQ9999, detalle y móvil sin desbordamiento ni consola. Pendiente publicación de PRs autorizados; sin merge/deploy.

## Publicación — 2026-10-23
[FE PR78](https://github.com/AlphaCodinggroup/kma_web/pull/78) hacia new-ui ampliado y [BE PR137](https://github.com/AlphaCodinggroup/kma-backend/pull/137) hacia main creado. Veredicto integrado APPROVE tras security/correctness/tests sin hallazgos pendientes, verificaciones y recorrido real. Permanecen abiertos, sin merge/deploy.
