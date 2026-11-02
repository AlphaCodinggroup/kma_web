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

## Publicación autorizada

Pablo autorizó el push y despliegue en
`https://new-ui.d3mbp3kh3ub3q9.amplifyapp.com` el 2026-11-02.
El destino confirmado es la rama `new-ui` de `AlphaCodinggroup/kma_web`,
aplicación Amplify `d3mbp3kh3ub3q9` en `us-east-2`, con despliegue automático
habilitado. La rama remota coincide con la base probada `5cb12ea`.
La publicación se prepara desde `.worktrees/preview-collapsible-navigation`,
conservando los cambios y la rama del checkout principal.

Revisión del diff: **APPROVE**. El control conserva la navegación móvil,
mantiene el foco, conserva el contenido de la página y expone su estado con
`aria-expanded` y `aria-controls`. No cambia autenticación ni contratos.
Los tres archivos de aplicación coinciden byte a byte con los comprobados.
Se conserva la identidad Git configurada de Pablo.

La comprobación local posterior del backend resolvió la colisión con Ponti:
la API de KMA escucha en `127.0.0.1:28080`; las cuatro rutas web de dashboard,
projects, flows y users respondieron 200. El ajuste de puertos permanece local
y no se publica en Amplify.

## Cierre del despliegue — 2026-11-02

- Commit publicado: `871fe886c6a195a983a394ae060279edc34ffc40` en `new-ui`.
- Amplify inició automáticamente el trabajo `13`; BUILD, DEPLOY y VERIFY
  finalizaron en `SUCCEED` a las 21:36:49 UTC. No se inició un trabajo manual.
- HTTPS `/login`: 200. Los 13 recursos estáticos referenciados respondieron 200.
  `/dashboard` sin sesión devuelve 307 a `/login`, como corresponde.
- Chrome cargó la página pública de login sin errores ni advertencias de consola.
  No se repitió la interacción autenticada en AWS: no se proporcionaron credenciales
  de ese ambiente. El menú se comprobó en local y Amplify confirma el commit publicado.
- El registro final se publica con `[skip-cd]`, conforme al procedimiento existente,
  para no repetir el despliegue por un cambio exclusivamente documental.

Hallazgo fuera de alcance, **UNVERIFIED**: GitHub informó 101 alertas de
dependencias en la rama predeterminada al realizar el push. No se investigaron
ni se atribuyen a esta rama; este cambio no modifica dependencias.

## Siguiente

Publicación funcional completada en la URL autorizada. El checkout principal
conserva su rama y sus cambios locales. La implementación y sus controles locales
consumieron aproximadamente 20 minutos; la publicación, aproximadamente 8 minutos.
