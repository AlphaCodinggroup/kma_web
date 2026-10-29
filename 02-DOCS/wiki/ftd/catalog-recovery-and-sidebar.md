---
author: Pablo
branch: fix/frontend-startup-warnings
status: verified
---
# Recuperación del catálogo y menú en ventanas bajas

## Intención y alcance
Corregir los dos fallos reproducidos en navegador: formulario de catálogo bloqueado
ante un fallo de red y enlaces del menú recortados a 1280 × 500 px. Sin cambios en
backend, contratos, datos o rama. Preservar el resto del trabajo local.

## Criterios y checklist
- [x] Tras un error de red, cerrar el formulario y acceder al reintento de la misma operación.
- [x] Mantener bloqueadas las escrituras nuevas mientras el resultado es incierto.
- [x] Acceder con ratón a Flows y User Management a 1280 × 500 px.
- [x] Pruebas de regresión, lint de archivos afectados, tipos y navegador aprobados.
- [x] Suite completa con cobertura: 3604 pruebas en 250 archivos; líneas 96,42 %, ramas 92,96 %, funciones 93,74 %.
- [x] Build de producción aprobado con Node 22.
- [x] Lint global sin errores ni advertencias, tras corregir el script RSC por autorización posterior de Pablo.

## Evidencia
Antes de corregir: el modal bloquea cierre y acceso al reintento; el menú aplica
`overflow-y-hidden` en escritorio y recorta los enlaces a 500 px de altura.

Pruebas nuevas con componentes reales: dos fallos antes del cambio y dos casos
aprobados después. Se comprobó cierre, conservación de la identidad, acceso al
reintento y bloqueo de escrituras nuevas. Suite focalizada: 102 pruebas en 9 archivos.
Logs: `/tmp/kma-ui-recovery-red-confirmed.log` y `/tmp/kma-ui-recovery-green.log`.

Chrome DevTools: 1280 × 500 px, menú con `overflow-y: auto`, desplazamiento de 94 px
y enlaces Flows/User Management visibles y alcanzables. Catálogo: se interceptó
el POST antes del envío; tras el fallo simulado se cerró el modal, se conservó la
operación y el reintento quedó fuera del área bloqueada. Sin escrituras de negocio.
Se limpió únicamente la operación simulada del almacenamiento de esa pestaña.

La primera comprobación de lint global falló por un error previo fuera del alcance inicial:
`scripts/rsc-compat.mjs:35 console is not defined (no-undef)`.
Se conserva en `/tmp/kma-ui-recovery-verify.log`. El lint de los tres archivos
afectados pasa. Se corrigió una opción inválida de TypeScript en la prueba nueva;
la comprobación de tipos posterior pasó.

Build y controles finales: salida 0 en `/tmp/kma-ui-recovery-checks-final.log`.
Drift y `git diff --check` aprobados. Las suites se ejecutaron con Node 22 y un
máximo de dos workers. No hubo cambios de backend ni escrituras de negocio.

## Cierre del error de lint — 2026-10-29
Pablo autorizó corregir todos los errores detectados. En `scripts/rsc-compat.mjs`
se importa `log` desde `node:console` para evitar depender de un global no declarado.
No se desactivaron reglas ni se alteró la configuración de ESLint. Con Node 22,
`node --check scripts/rsc-compat.mjs` y `npm run lint` terminaron con salida 0;
log: `/tmp/kma-ui-recovery-lint-fixed.log`. `git diff --check` y Drift aprobados.
No se repitieron suite ni build: el último cambio sólo afecta al mensaje de salida
del script, y ambos controles ya pasaron sobre las correcciones de UI.

## Siguiente
Todos los errores confirmados de esta revisión están corregidos localmente.
Cambios sin commit ni publicación.
