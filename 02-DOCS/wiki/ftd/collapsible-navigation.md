---
author: Pablo
branch: new-ui
status: verified
---
# Ocultar la navegación lateral

## Intención y alcance

Permitir ocultar el menú principal en escritorio para aprovechar todo el ancho
de la página. Un botón junto al logo alterna entre ocultarlo y mostrarlo.
El menú móvil conserva su apertura como diálogo. El cambio no modifica contratos.

## Criterios y checklist

- [x] El botón oculta y vuelve a mostrar el menú con ratón y teclado.
- [x] Al ocultarlo, el contenido recupera el espacio y no conserva el máximo de ancho de escritorio.
- [x] El botón permanece accesible y comunica si el menú está desplegado.
- [x] La navegación móvil conserva cierre, navegación y devolución de foco.
- [x] Lint, tipos, pruebas pertinentes y verificación en navegador completados.

## Evidencia

CONFIRMADO el 2026-11-02:

- Pruebas de shell con Node 22.23.4: 54 pruebas en 4 archivos aprobadas.
  Incluyen alternancia con Enter, foco conservado y contenido escrito sin perder.
  Log: `/tmp/kma-menu-unit-node22.log`.
- Chrome DevTools, 1440 px: el menú ocupa 248 px y el contenido pasa de 1192 a
  1440 px al ocultarlo. A 2560 px, el contenido ocupa 2560 px y su contenedor
  tiene `max-width: none`. Sin desbordamiento horizontal.
- Chrome, escritorio a 1024 px: el menú ocupa 248 px; en Flows, ocultarlo
  conserva el filtro escrito y la URL. Comprobado el tema oscuro.
- Chrome, móvil a 390 y 320 px: abre el diálogo de navegación, cierra con Escape
  y devuelve el foco al botón. Elegir Flows cierra el diálogo y navega.
  También abre en móvil después de ocultar el menú en escritorio; volver al
  escritorio conserva el estado oculto y el botón de restauración.
- Lint y tipos aprobados dentro de `npm run verify`. Su primera ejecución pasó
  3606 pruebas y falló en dos comprobaciones de variables ausentes: el comando
  había recibido las variables de compilación de CI también durante los tests.
  Las 30 pruebas de `env.test.ts` pasan al ejecutarse sin esas variables
  (`/tmp/kma-menu-env-clean.log`). No se modificó configuración ni tests ajenos.
  La repetición de cobertura sin variables de compilación pasa: 3608 pruebas
  en 250 archivos. Cobertura: líneas y sentencias 96,42 %, ramas 92,92 %,
  funciones 93,93 %. Se mantienen los mínimos del 90 %. La compilación de
  producción con las variables de CI también pasa. Estos controles se ejecutaron
  por separado, como en los dos jobs de CI. Logs conservados: `/tmp/kma-menu-verify.log`,
  `/tmp/kma-menu-coverage-clean.log` y `/tmp/kma-menu-build.log`.
- Enlaces locales en los tres documentos modificados: 94 comprobados, ninguno roto.

La verificación de navegador se limitó al menú y al espacio de trabajo, con
Next.js local y mock Cognito. El backend de datos no se inició: `make up` se
interrumpió por saturación al compilar todos los servicios (carga observada 252),
y construir solo frontend falló por un contexto Docker sin `package.json`.
Los errores de carga de datos no validan recorridos de negocio y no se repararon
en este cambio. Logs: `/tmp/kma-menu-local-stack.log` y
`/tmp/kma-menu-frontend-build.log`. Se detuvieron los procesos propios de la
comprobación local y mock Cognito al terminar las interacciones.

## Siguiente

Sin pendientes funcionales de este cambio. Cambios verificados localmente en
`new-ui`; no se publicaron ni desplegaron. Tiempo aproximado: 20 minutos,
incluidos la preparación local y los controles de calidad.
