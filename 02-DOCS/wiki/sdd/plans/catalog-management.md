---
type: plan
status: approved
date: 2026-10-21
approval: Implementación del plan solicitada explícitamente por Pablo.
---

# Implementación de Catalog

## Base y ajuste comprobado

PR 104 fusionado en `2f2fef0458554623d956e1b3e84d402cce640501`.
El worktree backend se actualizó por fast-forward a esa revisión; ahora existe un solo módulo Go raíz, los contratos viven en `pkg/contracts` y el adaptador de catálogo es `internal/db/dynamo/catalog`.
Esta adaptación de rutas no cambia el alcance aprobado.

## Contrato HTTP congelado

Todas las respuestas de éxito son JSON plano y todos los endpoints nuevos exigen admin; conservar los GET de catálogo existentes para actores autenticados.

Prefijo backend `/api/admin/catalog`; BFF `/api/catalog`.

- `GET /status`: `{active_version, revision, active: Version|null, enabled: boolean, limits: {max_file_size:3145728,max_uncompressed_size:33554432,max_items:10000,preview_size:20}}`.
- `POST /validate`: `{file_name,file_content}` → `{file_name,sha256,item_count,flow_count,duplicate_count:0,warnings:string[],sample:Sample[],expected_revision}`. No escribe.
- `POST /upload`: `{file_name,file_content,operation_id?,expected_revision?}`. La UI exige los dos campos opcionales por compatibilidad. Devuelve Operation, 200 completada o 202 en curso.
- `GET /versions?limit=20&cursor=...`: `{items:Version[],next_cursor:string|null}`; máximo 100.
- `GET /operations/{operation_id}`: Operation.
- `POST /activate`: `{version,operation_id,expected_revision}` → Operation.

`Version = {version:string,file_name:string,sha256:string,item_count:number|null,flow_count:number|null,uploaded_at:string|null,uploaded_by:string|null,status:"ready",active:boolean}`.

`Sample = {flow_code:string,barrier_id:string,question_code:string,question:string,cost:number|null,unit:string|null}`.

`Operation = {operation_id:string,kind:"upload"|"activate",status:"running"|"completed"|"failed"|"conflict",message:string,version?:string,previous_version?:string,revision?:string,file_name?:string,uploaded_at?:string,item_count?:number,flow_count?:number,error?:string}`.

Mantener los helpers de error actuales; validación 400, sin sesión 401, permisos 403, inexistente 404, revisión/carga distinta con igual operation_id 409. UI muestra los errores normalizados por el proxy; payload excesivo también se rechaza antes de upstream.

## Almacenamiento e interfaces congeladas

Misma tabla con claves `flow_code` / `catalog_item_id`:

- Activo: PK `__catalog_meta__`, SK `active`; campos `version` y `revision` como strings no vacíos.
- Versión: misma PK, SK `version#<version>`; campos del contrato Version sin `active`; solo `status=ready` es restaurable.
- Operaciones: PK `__catalog_operations__`, SK operation_id; conservar identidad de petición, actor, estado y resultado.
- Activaciones: PK `__catalog_activations__`, SK revisión UUID nueva, actor y fecha.
- Filas: PK `__catalog_v__#<version>#<logical_flow>`, SK `<barrier_id>#<question_code>`; contrato compartido existente.
- Manifiesto: PK `__catalog_manifest__#<version>`, SK logical_flow; paginar Query, nunca un array de tamaño ilimitado.
- Inicialmente no hay puntero: versión `legacy`, revisión `legacy:0`; filas originales sin prefijo. Antes de escribir una versión nueva, guardar su manifiesto legado completo para su recuperación. No borrar filas heredadas.
- Cada upload tiene una versión UUID propia; el SHA identifica contenido, operation_id la ejecución. Reclamar operación con condición y jamás reanudar otro escritor sobre filas de una versión ya completada.
- Activación: transacción que cambia puntero por expected_revision, completa operación y registra activación; condicionar versión completa y propiedad/estado de operación. Replays devuelven su resultado guardado. Conflictos y fallos nunca cambian el puntero.
- Escribir manifiesto y filas antes de estado ready. Solo consultas consistentes; rechazar metadatos corruptos o manifiestos faltantes de versiones nuevas.
- Reserva de namespace `__catalog_`; rechazar claves de entrada que lo utilicen.

Helper compartido `internal/db/dynamo/catalogsnapshot` (se implementa antes del trabajo paralelo):

`type Snapshot struct { Version string; Revision string }`

`Resolve(ctx, Getter, table) (Snapshot,error)`; `Pin(ctx, Getter,table) (context.Context,error)`; `Partition(version,flow) string`; `LogicalFlowCode(stored) string`; `ActiveKey() map[string]types.AttributeValue`; `VersionKey(version) map[string]types.AttributeValue`; `ManifestPartition(version) string`; `FlowCodes(ctx, Reader,table,Snapshot) ([]string,error)`; `ReadAll(ctx, Reader,table) ([]catalogcontract.Item,error)`.

Getter tiene GetItem; Reader tiene además Query y Scan, con firmas del SDK v2. Los repositorios exponen `PinSnapshot(context.Context) (context.Context,error)` para fijar versión en casos de uso sin acoplarlos a DynamoDB; los dobles existentes pueden omitir esta capacidad opcional.

## Partición y tareas

- [x] T0: PR 104 fusionado y base actualizada; evidencia remota MERGED y SHA.
- [x] T1: Helper de snapshot, primero pruebas de puntero ausente, metadatos inválidos, consistencia y pin estable.
- [x] T2: Gestión backend en paquetes nuevos de dominio/caso de uso/adaptador, parser acotado y bootstrap/rutas/config; pruebas de validación y transacciones contra tabla local aislada.
- [x] T3: Lectores existentes y operaciones de enriquecimiento/informe fijadas al snapshot; pruebas de páginas y fallback sin versiones mezcladas.
- [x] T4: UI, BFF, entidades, repositorios/hooks y pruebas de Catalog, SidebarNav y roles.
- [x] T5: Infraestructura declarativa, permisos y guía de publicación por etapas, sin apply.
- [x] T6: Integración, navegador, checks nativos focalizados y revisión adversarial; resultados y límites en la verificación del 2026-10-22 (sin atribuir aprobación a controles generales interrumpidos, según preferencia posterior de verificaciones ligeras).

T2, T3 y T4 tienen archivos disjuntos y contrato congelado, una vez completo T1; el integrador mantiene documentación, infraestructura y pruebas del recorrido combinado. No se comparten tablas mutables entre tareas.

## Publicación preparada

Lectores compatibles primero; luego gestión con escrituras condicionadas por `CATALOG_VERSIONING_ENABLED` (false por defecto AWS, true local); habilitar después de comprobar consumidores; UI al final. Las llamadas antiguas a upload pasan por el nuevo gestor y nunca por ReplaceAll. Durante la habilitación desactivada, rechazar mutaciones con 503 explicativo. Retener todas las versiones; la vuelta a binarios antiguos exige análisis de compatibilidad, no solo restaurar el puntero.

## Ampliación aprobada — 2026-10-23
Contrato acordado entre implementadores: POST /api/admin/catalog/imports recibe archivo + operation_id + expected_revision y devuelve 202 con Operation. GET /operations lista {items:Operation[],next_cursor}; GET /items recibe version, q, flow_id, barrier_id, limit y cursor y devuelve {items:CatalogItemDTO[],version,next_cursor}; DTO de registro agrega catalog_item_id. BFF usa /api/catalog. Operation incorpora queued y progreso opcional processed_items/total_items/started_at.

S3 privado conserva XLSX inmutable temporal7d. Operación/outbox se registran transaccionalmente antes de aceptar; envío SQS sólo referencias, reconciliador cada minuto. Worker160s presupuesto/180s Lambda, cuatro escritores/lotes25/tres intentos, versiones propias por intento y propiedad temporal; activación CAS tras completar. Mantener upload anterior. Consulta limita50 por defecto/200máximo más bytes; cursor vincula versión/filtros. UI inglesa, filtros en URL, descarta respuestas antiguas, consulta histórica sin activar, polling y recuperación reciente. Preparar Compose, SAM, Terragrunt y artefactos sin apply/deploy.

### Tareas y comprobación
- [x] BE: importación/outbox/worker/reconciliación; pruebas de fallo, reintentos y CAS verdes.
- [x] BE: lectura activa/histórica paginada; recorrido sin pérdidas/duplicados ni mezcla de versiones.
- [x] FE: tabla/detalle/filtros/versiones y BFF; pruebas de contrato y estados verdes.
- [x] FE: carga asíncrona/progreso/recuperación; prueba de recarga y respuesta perdida.
- [x] Infra: recursos, rutas, artefactos; validación local de configuración.
- [x] Integración: referencia1843 y máximo10000/3MiB, navegador y recuperación aislada.
- [x] Revisión independiente, evidencia, commits y PRs vinculados: web78 y backend137.

### Análisis previo
Constitución leída, contrato Go como fuente, proxy compartido, permisos admin, snapshots y CAS conservados. Tareas FE/Go/infra con propietarios separados y contratos fijados. El costo de verificación se limita a checks afectados y un build estable. Riegos prioritarios: brecha DB/cola resuelta con outbox; escritor vencido con intento/lease propio; mezcla de páginas con cursor de versión. Sin contradicciones abiertas con el alcance aprobado.

## Plan aprobado — CRUD y exportación (2026-10-23)

1. Backend: POST /items, PUT y DELETE /items/{flow_id}/{catalog_item_id}; operación durable con operation_id, base_version y expected_revision. Worker existente aplica un cambio a copia completa y activa mediante revisión esperada.
2. Export: GET /export?version= devuelve XLSX completo; hoja Catalog compatible con import; generación compartida y validación de límites.
3. Frontend: formulario Add/Edit, confirmación Delete, Export Excel, seguimiento de operaciones y recuperación. Preservar formulario ante errores/conflictos; actualizar versión activa al completar.
4. Infraestructura: registrar rutas en SAM, Terragrunt y runtime local.
5. Evidencia: CRUD independiente por fila, colisiones, costo cero/ausente, permisos, concurrencia y reintentos; export/reimport de referencia y máximo; lint, tipos, build y navegador.

Contrato de escritura: {operation_id,base_version,expected_revision,item?:{flow_id,barrier_id,question_code,question,mitigation_id,barrier_statement,proposed_mitigation,adas_reference,cost,unit}}. item solo en POST/PUT; operación kind create/update/delete y respuesta 202 en curso. Mantener rango 1–10000 registros. Trabajar en checkouts originales y ramas actuales.
