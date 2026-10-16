# Rediseño premium de KMA

Estado: implementación. Plan aprobado explícitamente por Pablo en esta conversación.

## Contrato

Sobria con identidad propia. Petróleo y turquesa, Manrope para títulos y Source Sans 3 para lectura. Temas completos, márgenes 16/24/32 px, radios 8/12 px. Se conserva Next.js, React Query, RSC, permisos, rutas, contratos, filtros en URL, guardado secuencial y PDF consolidado por proyecto.

## Partición

Trabajo en el worktree existente. Contratos compartidos definidos primero por el coordinador. Módulos separados, sin cambios al backend ni ejecución concurrente de pruebas que escriban datos.

- Coordinador: estados internos iniciales, tokens, componentes compartidos, navegación, login, dashboard, E2E, integración y documentación.
- Gestión: Projects, Facilities, Users y detalle de proyecto, con sus tests.
- Auditorías: Audits, Reports y revisión/QC, con sus tests y consumidores de estados.
- Flujos: listado, editor, diálogos y tests del módulo Flows.

## Entregas

- [ ] Base estable y estados reales.
- [ ] Sistema visual y feedback compartido.
- [ ] Navegación, acceso y temas.
- [ ] Dashboard y proyecto.
- [ ] Projects y Facilities.
- [ ] Audits y Reports.
- [ ] Revisión y PDF.
- [ ] Flows.
- [ ] Users.
- [ ] Verificación integral y comparativas visuales.

## Comprobación

Pruebas de comportamiento, npm run verify, navegador con backend local, matriz 390/768/1440 en ambos temas, además de 320/1280 y zoom. Revisión de foco, teclado, contraste, movimiento reducido, errores y resultados parciales. Antes/después con el mismo contexto. Las verificaciones pendientes se informarán como pendientes.
