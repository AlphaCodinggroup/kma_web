---
type: implementation
author: Pablo
branch: fix/frontend-startup-warnings
status: published
---
# Frontend sin advertencias

## Intención
Corregir los avisos de instalación, lint, compilación y navegador; entregar un PR con base en new-ui, confirmado por Pablo.

## Alcance
Correcciones del frontend y su configuración. Se excluyen el gestor Catalog todavía sin versionar, su hook y los cambios locales del shell. La rama parte de origin/new-ui en 2f55f89. Los procesos y configuración de la vista previa local permanecen en el worktree original.

## Archivos
Tipos y mappers de auditorías y flows, repositorio de auditorías, componentes de formularios y búsqueda, mensajes de error, previsualización de imagen y sus pruebas; package.json/lock, ESLint, TypeScript y Vitest (.ts → .mts); referencias documentales e índice. El override de cobertura que ya existía localmente se incluye para que una instalación del PR tampoco incorpore glob obsoleto.

## Checklist
- [x] Reproducir y corregir las causas sin desactivar reglas ni bajar el 90% de cobertura.
- [x] Comprobar el contenido aislado del PR con lint, tipos, pruebas afectadas y build.
- [x] Crear el PR solicitado sin fusionar ni desplegar: https://github.com/AlphaCodinggroup/kma_web/pull/78.

## Evidencia de la rama del PR
Con Node 22 y npm 10, lint con cero advertencias, TypeScript y build terminaron con código 0. Las pruebas afectadas aprobaron 19 archivos y 618 casos. Logs locales: /tmp/kma-warnings-pr-static.log, /tmp/kma-warnings-pr-tests.log y /tmp/kma-warnings-pr-build.log. Se revisó el diff contra 2f55f89 y se comprobó whitespace respetando CRLF. No se repitió la cobertura completa: el cambio conserva el umbral y se reutiliza la evidencia previa indicada abajo.

## Evidencia previa y límites
El worktree original new-ui aprobó 3558 pruebas y cobertura general, seguidas de 69 pruebas focalizadas, lint y build sin avisos tras corregir identificadores. Login y ocho vistas pasaron en Chrome sin mensajes warn/error/issue. Esa evidencia describe el entorno original con Catalog local; no se presenta como una corrida de esta nueva rama.
Drift global ya detectaba enlaces rotos y artículos obsoletos del harness/rediseño. No se migra documentación histórica ni se afirma que Drift global está aprobado.

## Siguiente
Publicar la rama verificada y abrir el PR autorizado hacia new-ui; no fusionar ni desplegar.
