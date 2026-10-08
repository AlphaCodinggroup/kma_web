---
title: Paridad con main y editor de flujos de producción
status: implementado en new-ui; comprobaciones locales completas, revisión de Pablo pendiente
---

# Paridad con main y editor de flujos de producción

Pablo comparó el editor de flujos de producción (`main`, 03e3d1d, Amplify `main`) con el de `new-ui` y vio que el nuevo no era "la última versión". Pidió reproducir el editor de `main` con el estilo nuevo, auditar toda la aplicación y revisar si la causa estaba en la documentación.

## Causa

`main` es el padre directo de `new-ui` (03e3d1d); no avanzó mientras tanto. La divergencia nació dentro del rediseño:

- La iteración "premium" conservaba la estructura de `main` ([antes](premium/before/flow-editor-light-1440.png)).
- La iteración Daylight la reemplazó por un índice de pasos de 300 px y un inspector, y lo dejó escrito como norma en `DESIGN.md`, `implementation.md` y `validation/entrega.md`.
- Las comparaciones "antes/después" (`validation/capturas.md`) usaron la iteración premium como "antes", nunca producción.
- `PRODUCT.md` apuntaba a capturas de `main` en `../screenshots/`, una ruta que no existe.

Resultado: nadie comparó contra producción, y la afirmación "se conservan todas las funciones" era más amplia que lo verificado. **Regla nueva:** toda comparación visual se hace contra `main` en producción. Línea base: [captura de producción](validation/main-baseline/flow-editor-main-production-light.png) y [el editor de `new-ui` antes de esta corrección](validation/main-baseline/flow-editor-new-ui-before-dark.png).

## Alcance

**Editor de flujos (estructura de `main`, estilo nuevo)**

- Encabezado `Edit Flow: <título>`.
- Título en línea con "· N nodes" y botón ⓘ de ayuda; descripción en línea debajo.
- "Unsaved changes" y Discard solo con cambios, Export y Save Flow.
- Tabla de pasos (ID / Type / Question / Title / Routing / Barriers) con chips YES verde, NO rojo, NEXT gris, COND y opciones en azul; borde de fila seleccionada; papelera al pasar el puntero.
- Inspector de 340–480 px con tipo, "Editing step details", miniaturas, "Add Image" y papelera en la cabecera del paso.
- Guía completa de `main` (Inline Create, tipos de paso, Visual Checks, Double Dipping).
- Se conserva de `new-ui`: diálogos de confirmación en lugar de `confirm()`/`alert()`, editor montado mientras guarda, cajón "Browse steps" por debajo de 1280 px, etiquetas accesibles y objetivos táctiles de 44 px.

**Regresiones fuera de flujos** (auditoría de las 11 pantallas contra `main`)

| Dónde | Problema | Arreglo |
|---|---|---|
| Instalaciones | Se podía vaciar Address o City al editar | Name, Address y City obligatorios al crear y al editar |
| Proyectos e instalaciones | Un error de borrar, archivar o restaurar quedaba pegado en el diálogo de otro elemento | Se limpia al abrir cada diálogo |
| Revisión de auditoría | Yes y No del mismo gris; UNSURE sin realce | Yes en tinta, No en rojo, tarjeta UNSURE resaltada |
| Lista de auditorías | Un cambio de filtro vaciaba la tabla | Se conservan las filas anteriores mientras carga |
| Lista de auditorías | `?status=` inválido terminaba en "Failed to load audits" | Solo se aceptan los estados del filtro |
| Lista de auditorías | La X de limpiar no aparecía con solo texto de búsqueda | Aparece también con búsqueda activa |
| Lista de auditorías (móvil) | Sin tooltip ni spinner al borrar | Restaurados |
| Usuarios | El email exigía un punto (`x@localhost` no se podía guardar) | Misma regla que el campo email del navegador |
| Cabecera | La miga decía "User management" y el menú "User Management" | Unificado |

**Documentación**

- `DESIGN.md` y `.impeccable/design.json`: rojo KMA en lugar del dorado, editor de flujos de producción, regla de comparar contra `main`.
- `implementation.md` y `validation/entrega.md`: aviso de que el dorado y el índice de 300 px fueron reemplazados.
- `PRODUCT.md`: la línea base es `main`, no una ruta inexistente.
- `docs/agents/project-context.md`: 9 `FIXME`, no 10.
- `src/features/flows/ui/app_example.md`: clave `"type"` mal escrita, enlaces a archivos que no existen, opciones de Select con `yes_next`/`no_next` (#71) y `code` del flujo (#72).

## No se tocó (decidido por Pablo)

Menú Projects/Facilities separado y agrupado, franja de revisión del dashboard, etiquetas cortas de estado ("Pending review", "In review", "Delivered"), botón Review, fotos en las respuestas de revisión, paginación incremental de auditorías, encabezado con logo y miga de pan.

**Descartado como error.** "Workspace total" en el dashboard es correcto: el backend (`get-dashboard`) cuenta proyectos activos y archivados; el "Active" de `main` era el rótulo equivocado.

## Checklist

- [x] Tabla de pasos con encabezados, chips de ruteo y borde de selección; lista compacta para el cajón móvil.
- [x] Inspector con acciones de imagen en la cabecera; sin la sección "Reference images" del pie.
- [x] Barra superior de `main`, guía completa y título `Edit Flow: …`.
- [x] Nueve regresiones corregidas, cada una con su prueba.
- [x] Documentación corregida (lista arriba).
- [x] `npm run verify`: lint sin errores (50 advertencias previas), tipos, 3.437 tests en 238 archivos, cobertura 96,19 % de líneas, build de producción.
- [x] Navegador contra el backend local: `flow-editor` y `premium` (incluye axe WCAG 2.2 AA en Light y Dark, 320/390/768/1280 px y desborde) en verde.
- [x] Resto de specs de navegador (redesign, crud, audit-navigation, interactions, auth, routes, report-flow): 47 tests de Chromium en verde en total. En la primera pasada fallaron dos de error de cursor porque quité `retry: false` de la lista de auditorías; se restauró (se conserva `keepPreviousData`) y pasaron tras reconstruir.
- [x] Capturas del editor nuevo: [Light 1440](validation/main-parity/flow-editor-light-1440.png), [Light 1280](validation/main-parity/flow-editor-light-1280.png), [Dark 1440](validation/main-parity/flow-editor-dark-1440.png) y [Dark 390](validation/main-parity/flow-editor-dark-390.png).
- [ ] Revisión de Pablo contra producción.
- [ ] Push a `new-ui`, despliegue en Amplify y comprobación pública.

## Límites

Las capturas de esta carpeta no repiten las 66 de la entrega anterior: solo cubren el editor de flujos. Las comprobaciones corren sobre un build local y el backend de pruebas con datos sintéticos; el flujo de la seed local (10 pasos) no es el de producción (71 pasos). No se probaron Safari, Firefox ni dispositivos reales. No pude abrir `main` en Amplify (pide sesión): la línea base es la captura que Pablo compartió. Cero infracciones de axe no certifica WCAG AA. La aceptación del diseño corresponde a Pablo.
