---
type: specification
title: Catalog
status: approved
date: 2026-10-21
approval: Pablo pidió explícitamente implementar el plan completo en el chat.
---

# Catalog

## Objetivo aprobado

Agregar Catalog inmediatamente debajo de Reports en new-ui para seleccionar un XLSX, validarlo sin escrituras, revisar sus resultados y confirmar el reemplazo completo del catálogo global del ambiente; conservar versiones completas restaurables.

## Comportamiento

- Administración protegida en servidor; conservar permisos de lectura existentes.
- Archivo de referencia: 1843 registros, 52 flows, ocho costos cero; advertir cuatro filas excluidas de Pending variants.
- Validar el archivo entero, sus claves, números y límites antes de escribir; los errores indican fila cuando corresponde.
- Conservar datos activos ante errores; ninguna versión parcial se activa.
- Cada activación cambia la revisión y exige la revisión esperada; incluir restauraciones A → B → A.
- Repetir una operación consulta su resultado sin volver a activar ni sobreescribir una versión posterior.
- Fijar una versión durante toda lectura, enriquecimiento e informe; no modificar auditorías ni informes históricos.
- Interfaz inglesa, móvil y escritorio, temas actuales, teclado, confirmación, errores y resultado incierto con consulta posterior.

## Límites aprobados

3 MiB de archivo, 32 MiB descomprimidos, 10000 registros, muestra de 20, historial de 20 por página (máximo 100), cuatro escritores con lotes de 25 y presupuesto síncrono de 20 segundos.

## Entrega

Implementación y verificación local, contratos y publicación preparada; no publicar Catalog ni cargar el Excel en AWS.
El PR backend 104 es una tarea separada autorizada para squash.

## Aceptación

Los diez escenarios A1–A10 del [prompt](../../ftd/catalog-implementation-prompt.md) son criterios de aceptación, además de lint, tipos, cobertura/build web y pruebas Go/integración afectadas.

## Ampliación aprobada — 2026-10-23
Pablo solicitó implementar el plan completo: carga asíncrona de XLSX hasta 3 MiB y 10.000 filas; consulta de todos los registros activos e históricos completos con búsqueda/filtros/paginación y detalle; recuperación de operaciones y progreso persistido. La entrega amplía PR web 78 contra new-ui y abre PR backend contra main; no incluye merge ni despliegue.

Aceptación adicional: el máximo válido debe importarse; un navegador cerrado no cancela el trabajo; pérdidas de envío, duplicados, reinicios y CAS conservan integridad; búsqueda alcanza páginas posteriores y nunca mezcla versiones; costos cero y ausentes siguen distintos.
