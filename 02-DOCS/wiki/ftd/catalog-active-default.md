---
author: Pablo
branch: new-ui
status: verified
---
# Catálogo activo por defecto e historial acotado

## Intención y alcance

Catalog abre el catálogo activo sin fijar automáticamente su identificador en
la URL. Las versiones históricas se consultan por elección explícita y pueden
restaurarse con confirmación. El backend conservará la activa y tres anteriores,
según la política aprobada por Pablo. La app móvil no se modifica. Por pedido adicional, el logo del encabezado
lleva a `/dashboard` mediante un enlace accesible en escritorio y responsive.

## Criterios y checklist

- [x] La entrada normal y una nueva búsqueda consultan el catálogo activo; la URL no se fija a legacy.
- [x] La paginación conserva el snapshot mediante el cursor del backend.
- [x] Las cargas/restauraciones completadas devuelven a la vista activa y limpian el cursor.
- [x] Un cambio del catálogo activo actualiza la vista normal y conserva una consulta histórica explícita.
- [x] El historial permite consultar/restaurar las tres versiones anteriores conservadas.
- [x] Pruebas de regresión, lint, tipos y navegador aprobados.
- [x] El logo del encabezado permite volver a Dashboard con ratón y teclado.
- [x] Backend y web publicados y verificados en Dev.

## Evidencia

El cursor del backend contiene la versión consultada. `ListItems` permite enviar
`version=active` o no enviar versión junto a ese cursor sin mezclar snapshots.
La fijación automática del identificador en la URL del frontend no es necesaria.
La política y evidencia de retención se documentan también en el backend.

Regresión reproducida antes del cambio: cinco pruebas fallaban por fijación de
versión en URL, selección incorrecta al paginar y falta de actualización tras
cambiar la activa. Resultado posterior: 48 pruebas de UI de catálogo y 53 de
shell aprobadas; lint y tipos aprobados. El primer intento global con cobertura
falló por dos timeouts de flows bajo carga concurrente, conservado en
`/tmp/kma-catalog-active-verify.log`. Los 60 casos de esos dos archivos pasaron
al ejecutarlos aparte sin ampliar tiempos; build de producción aprobado.

Chrome DevTools: `/catalog` conserva URL sin versión y selector en Current active
catalog. Upload XLSX sigue primero; logo KMA navega a Dashboard en 1440×900 y
390×844, sin desbordamiento ni errores de consola. Las consultas históricas
siguen siendo explícitas mediante el selector y su URL; para volver al activo
se elimina versión y cursor. La app móvil no se modificó.

## Siguiente

El segundo gate global, con un worker y sin las integraciones costosas en
paralelo, pasó: 3607 pruebas en 250 archivos; cobertura de líneas/sentencias
96,42 %, ramas 92,89 % y funciones 93,93 %, conservando los mínimos del 90 %.
No se modificaron flows ni los tiempos de prueba. Log:
`/tmp/kma-catalog-active-coverage-final.log`. Publicar y verificar Dev.

## Cierre de despliegue — 2026-10-29

Publicado en new-ui, commit `ef1d7ff0070c232375561af744ee213ef2936afa`.
Amplify11: BUILD/DEPLOY/VERIFY en SUCCEED. HTML y CSS públicos responden200;
Catalog redirige al visitante sin sesión a login. La comprobación autenticada
del selector y logo se hizo en local; no se importaron catálogos reales en AWS.
BE Dev us-east-1 tiene actualizadas las cuatro Lambdas afectadas al commit
`9f9e4ccc`, con reconciliación de retención invocada sin errores. Prod y la app
móvil no se modificaron. Tiempo aproximado:23minutos. Sin pendientes funcionales.
Este cierre se registró después del commit desplegado.

## Simplificación del selector — 2026-10-29

Pablo pidió eliminar el botón redundante View active catalog. Catalog version
queda como único control para elegir la versión mostrada; Current active catalog
permite volver a la activa. Criterio: el botón no aparece y el selector conserva
consulta histórica y retorno al activo. Lint, tipos y las 48 pruebas de UI del catálogo aprobados. La prueba de
retorno desde el original ahora elige Current active catalog en el selector.
Chrome confirma ausencia del botón, selector activo y sin desbordamiento.
Publicado en new-ui, commit `318dfa5a8999566e7fc0033bd77116105f8f2464`,
Amplify 12 SUCCEED. HTML/CSS públicos responden 200; acceso de invitado a Catalog
redirige a login. La ausencia del botón y el selector se verificaron en local.
Tiempo aproximado: 5 minutos, incluido el despliegue. Sin pendientes funcionales.
El cierre documental se publica con el marcador estándar de Amplify
[skip-cd](https://docs.aws.amazon.com/amplify/latest/userguide/edit-build-settings.html#skipping-build-for-a-commit)
para evitar recompilar por metadatos sin cambios de aplicación.
