---
name: KMA Daylight Section
description: Papel marfil, tinta grafito y luz dorada para un espacio de revisión preciso.
colors:
  primary: "#795619"
  accent: "#d6a43a"
  accent-fg: "#1c1f22"
  bg: "#f2efea"
  surface: "#fffefc"
  subtle: "#eae7e1"
  fg: "#1c1f22"
  muted: "#62655f"
  border: "#d4d0c8"
  selected: "#f4e8cb"
  primary-contrast: "#ffffff"
  dark-primary: "#ebc773"
  dark-accent: "#e3b653"
  dark-bg: "#171b1d"
  dark-surface: "#222729"
  dark-subtle: "#2b3132"
  dark-fg: "#f2efea"
  dark-muted: "#b9bcb6"
  dark-border: "#414747"
  dark-selected: "#3b3423"
  dark-primary-contrast: "#1c1f22"
  brand: "#1c1f22"
  brand-fg: "#f2efea"
  brand-muted: "#b9bcb6"
  brand-border: "#414747"
  inverse-surface: "#272c2e"
  inverse-subtle: "#303638"
  inverse-selected: "#373326"
  danger: "#b4233e"
  danger-bg: "#fff1f3"
  danger-border: "#f1c3cd"
  warning: "#865b08"
  warning-bg: "#fff7e7"
  warning-border: "#eed9a9"
  success: "#217453"
  success-bg: "#edf8f2"
  success-border: "#bddfcd"
  info: "#186590"
  info-bg: "#eaf5fb"
  info-border: "#bbdced"
  dark-danger: "#ff9aab"
  dark-danger-bg: "#361f2c"
  dark-danger-border: "#653144"
  dark-warning: "#edc578"
  dark-warning-bg: "#312b1f"
  dark-warning-border: "#5d4d31"
  dark-success: "#83d6b0"
  dark-success-bg: "#17382e"
  dark-success-border: "#2e5948"
  dark-info: "#8bc8ed"
  dark-info-bg: "#183344"
  dark-info-border: "#2c536b"
typography:
  display:
    fontFamily: "Chakra Petch, Manrope, ui-sans-serif, sans-serif"
    fontSize: "clamp(32px, 3.4vw, 44px)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  login-display:
    fontFamily: "Chakra Petch, Manrope, ui-sans-serif, sans-serif"
    fontSize: "50px"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  login-display-xl:
    fontFamily: "Chakra Petch, Manrope, ui-sans-serif, sans-serif"
    fontSize: "60px"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  wordmark:
    fontFamily: "Chakra Petch, Manrope, ui-sans-serif, sans-serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.06em"
  title:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
  body:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4667
  control:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  field:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  field-touch:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "20px"
  auxiliary:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  navigation-group:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.12em"
  counter:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.04em"
  counter-md:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.04em"
rounded:
  control: "4px"
  panel: "8px"
spacing:
  tight: "8px"
  field: "12px"
  group: "16px"
  panel: "20px"
  section: "24px"
  modal-wide: "28px"
  desktop: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "color-mix(in srgb, var(--kma-accent) 88%, var(--kma-surface))"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.subtle}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.subtle}"
  button-destructive:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    typography: "{typography.field}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.panel}"
  navigation:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-muted}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  navigation-selected:
    backgroundColor: "{colors.inverse-selected}"
    textColor: "{colors.dark-primary}"
    rounded: "{rounded.control}"
  badge-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning}"
    typography: "{typography.label}"
    padding: "2px 10px"
---

# Design System: KMA Daylight Section

## Overview

**Creative North Star: "Daylight Section"**

Una mesa de revisión con precisión arquitectónica: papel marfil, tinta grafito y luz dorada. Los títulos angulares inclinados dan identidad; el cuerpo recto, las reglas finas y los controles familiares permiten leer y trabajar con calma.

La composición conecta tareas, datos y evidencias reales. La marca aparece en el contraste de navegación, los recuentos y el encuadre de fotografías, mientras los estados conservan su significado operativo. El tema oscuro cambia el papel por grafito sin perder esta relación entre fondo, superficie y texto.

Este sistema documenta la sustitución aprobada de la identidad petróleo; el [diseño anterior](../premium/DESIGN.md) queda como historia. La [dirección elegida](implementation.md) explica su intención y [PRODUCT.md](../../../../../PRODUCT.md) conserva las restricciones del producto. Los valores se extraen del [estilo global](../../../../../app/globals.css), las [fuentes locales](../../../../../app/layout.tsx), los [controles](../../../../../src/shared/ui/controls.tsx) y los componentes citados abajo; este documento no certifica comprobaciones de navegador ni una compilación final.

**Key Characteristics:**

- Papel marfil y grafito, con dorado para acciones y señales de revisión.
- Chakra Petch inclinada para identidad; Manrope para secciones y cifras; Source Sans 3 para lectura.
- Superficies planas, reglas finas y esquinas contenidas.
- Navegación grafito estable en los dos temas.
- Evidencias reales junto a respuestas; informe blanco separado del tema de la aplicación.

## Colors

El dorado aporta luz a una base mineral; los colores semánticos señalan estado, sin sustituir la lectura del texto.

### Primary

- **Oro de acción** (`accent`): fondo de botones principales y detalle de marca; lleva tinta grafito (`accent-fg`). En oscuro usa `dark-accent`.
- **Ocre de lectura** (`primary`): enlaces, foco, selección de texto y controles de formulario. En oscuro y navegación inversa usa `dark-primary`.

### Secondary

- **Éxito**, **advertencia**, **error** e **información**: cada tono tiene texto, fondo suave y borde propios. Las variantes `dark-*` conservan el significado en oscuro. Los estados combinan color y etiqueta visible.

### Neutral

- **Papel marfil** (`bg`) y **papel iluminado** (`surface`): fondo de trabajo y superficie de campos, filas y paneles.
- **Papel secundario** (`subtle`) y **papel seleccionado** (`selected`): cambios de estado y selección.
- **Tinta grafito** (`fg`), **tinta secundaria** (`muted`) y **regla mineral** (`border`): lectura principal, contexto y separación.
- **Grafito de marca** (`brand`): navegación persistente; `brand-fg`, `brand-muted` y `brand-border` permanecen iguales al cambiar el tema.
- **Superficies inversas** (`inverse-surface`, `inverse-subtle`, `inverse-selected`): campo, interacción y selección sobre la navegación grafito.
- **Papel nocturno** (`dark-bg`, `dark-surface`, `dark-subtle`): fondo y capas del tema oscuro; usa tinta marfil y bordes grafito medios.

**The Gold and Ink Rule.** El dorado claro sirve como superficie o señal; los enlaces y el foco usan el ocre de lectura del tema, y el botón dorado conserva texto grafito.

## Typography

**Display Font:** Chakra Petch local, con Manrope y sans-serif como respaldo. Se sirven las variantes regular e inclinada de peso normal (400).

**Body Font:** Source Sans 3 local, con ui-sans-serif, system-ui y sans-serif como respaldo.

**Section Font:** Manrope local, con ui-sans-serif, system-ui y sans-serif como respaldo. Las tres familias tienen sus licencias OFL en `public/fonts/`.

**Character:** La geometría inclinada pertenece a la marca y a los títulos de página. Manrope ordena secciones y recuentos; Source Sans 3 mantiene la lectura de formularios, navegación, tablas y metadatos.

### Hierarchy

- **Display:** título de página fluido (32–44 px, peso 400, interlínea 1.15, espaciado −0.035 em), inclinado y en mayúsculas; su definición normativa es `display`.
- **Login display:** el título de la ilustración de acceso crece de (50 px) a (60 px) desde el ancho `xl`, con interlínea (1.05); es una variante localizada de `display`.
- **Wordmark:** marca inclinada (28 px, peso 400, interlínea 1, espaciado 0.06 em), con un pequeño cuadrado dorado.
- **Title:** secciones (20/28 px, peso 600). Los títulos de diálogo usan el mismo tamaño con peso firme (700).
- **Body:** lectura (15 px, interlínea 1.4667, aproximadamente 22 px). Los subtítulos de página tienen ancho máximo (65 ch).
- **Control:** botones y navegación (14/20 px); el botón usa peso (600) y la navegación combina pesos (500/600). Las etiquetas compartidas de formulario usan (14 px, peso 500).
- **Field:** campos (14/20 px) en escritorio; pasan a (16 px) bajo (1024 px) o con puntero táctil. Los botones conservan su tamaño de texto.
- **Label:** badges y ayuda breve (12 px); el badge usa interlínea (20 px). Metadatos de usuario y salida usan (13 px); agrupaciones funcionales de navegación y referencias compactas usan (11 px).
- **Counter:** recuentos de revisión (32 px), ampliados a (40 px) desde `md`, con Manrope, peso (500), cifras tabulares e interlínea (1).

**The Two Reading Speeds Rule.** La inclinación y las mayúsculas identifican página y marca; campos, respuestas y datos mantienen tipografía de lectura recta.

## Layout

El [espacio de trabajo](../../../../../src/widgets/shell/AppShell.tsx) tiene cabecera de (64 px), navegación lateral de (248 px) desde (1024 px) y contenido con ancho máximo de (1440 px). La zona de contenido tiene desplazamiento propio y ancho mínimo cero; sus márgenes interiores son (16 px), (24 px) desde `md` y (32 px) desde `lg`, con separación vertical de (24/32 px).

La cabecera de página permite que título y acción cambien de línea; una regla inferior y el espacio de sección los separan del contenido. Listados y respuestas comparten contenedores continuos, con bordes entre filas. Los módulos adaptan tabla, detalles y acciones al espacio disponible, sin una cuadrícula fija universal.

Por debajo de (1024 px), la navegación lateral se abre en diálogo desde la cabecera; su ancho es el menor entre (320 px) y el ancho de pantalla menos (40 px). Los controles tienen altura mínima de (40 px) en escritorio y de (44 px) por debajo de (1024 px) o con puntero táctil; la navegación y los botones de icono ya usan objetivos de (44 px).

Los puntos de cambio observados son `sm` (640 px), `md` (768 px), `lg` (1024 px) y `xl` (1280 px). El dashboard coloca actividad y portfolio en columnas desde `xl`, con una columna de portfolio de (260 px). El editor de flujos muestra pasos en una columna de (300 px) desde `xl` y ofrece un diálogo de pasos por debajo. Las respuestas con fotografías usan dos columnas desde `md`; en poco espacio la evidencia queda debajo de la respuesta.

El acceso usa una composición de dos columnas desde `lg` (1.15:1), con ilustración original a la izquierda y formulario de ancho máximo (380 px) a la derecha. Por debajo, la ilustración se oculta y quedan marca, apariencia y formulario. Estas son composiciones de sus superficies, no requisitos para todas las páginas.

## Elevation & Depth

El espacio operativo es plano: fondo, superficie, borde y estado separan los contenidos. Las sombras se reservan para elementos superpuestos; un anillo de foco representa interacción, no elevación.

### Shadow Vocabulary

- **Diálogo:** sombra difusa (`0 16px 48px rgb(19 23 24 / 18%)`) y velo (`rgb(19 23 24 / 60%)`); el diálogo compartido añade desenfoque de fondo (2 px).
- **Navegación móvil:** sombra del panel superpuesto (`0 25px 50px -12px rgb(0 0 0 / 25%)`).

**The Paper Plane Rule.** Paneles y filas se separan por tono y regla; la sombra expresa una capa superpuesta.

Las transiciones de color, borde y foco duran (150 ms) con curva `ease`. La pulsación del botón baja su contenido (1 px). Con movimiento reducido, las animaciones y transiciones pasan a (0.01 ms), la animación se limita a una vuelta y el desplazamiento vuelve a ser inmediato.

## Shapes

Controles de esquinas discretas (4 px), paneles y contenedores de datos de esquinas suaves (8 px), y reglas de (1 px). Los badges de estado son plenamente redondeados; esta forma compacta identifica una etiqueta y no altera la forma de las filas de navegación.

La marca combina letras angulares con un cuadrado dorado de (6 px), separado por (6 px). Los indicadores cuadrados de revisión y los encuadres de evidencia hacen visible la relación con un plano arquitectónico sin añadir ornamentos a los datos.

## Components

### Buttons

Acciones firmes y reconocibles, sin sombra de base. El [botón compartido](../../../../../src/shared/ui/controls.tsx) ofrece principal, secundario, discreto y destructivo; comparten esquinas, separación entre icono y texto (8 px), relleno (8 × 16 px) y altura mínima operativa.

El principal usa dorado y grafito; el secundario usa superficie con borde; el discreto tiene fondo transparente; el destructivo usa el fondo suave, borde y texto de error. Al pasar el puntero, el principal mezcla dorado (88 %) con superficie, los secundarios usan tono sutil y el destructivo mezcla su fondo (85 %) con el tono de error. El foco usa un anillo (2 px). Pendiente y deshabilitado conservan la etiqueta y reducen opacidad; el ancho completo es el valor por defecto, con acciones de cabecera ajustadas a su contenido.

### Chips

Etiquetas de estado compactas y legibles. El [badge compartido](../../../../../src/shared/ui/badge.tsx) ofrece variantes suave, sólida y de contorno; el estado habitual usa fondo suave, texto semántico y borde interior (1 px). Su tamaño pequeño tiene relleno (2 × 10 px) y el mediano (4 × 12 px). El texto expresa el estado aunque el color no se perciba.

### Cards / Containers

Una hoja de trabajo continua. Los paneles usan superficie, borde fino y radio de panel; las filas se separan dentro del mismo contenedor. El relleno se adapta al contenido con los pasos compartidos de (16/20/24/32 px), sin convertir cada bloque de información en una tarjeta independiente.

### Inputs / Fields

Campos rectos sobre papel, con etiqueta visible. Campo y textarea usan superficie, texto principal, borde y relleno (8 × 12 px). El foco del control compartido añade anillo (2 px); el campo de estilo base usa borde ocre y anillo suave (3 px). El error cambia borde y foco al tono de error; el texto de ayuda y el mensaje quedan junto al campo. Deshabilitado reduce opacidad (0.6). El control de contraseña conserva un objetivo de (44 px).

### Navigation

Grafito persistente con texto marfil y gris claro. La [navegación](../../../../../src/widgets/shell/SidebarNav.tsx) usa filas con esquinas de control, iconos de trazo y altura mínima (44 px); la selección combina fondo dorado tenue, texto ocre claro y peso firme. El puntero introduce el fondo seleccionado; el estado pendiente muestra indicador de carga. El diálogo móvil mantiene esta misma identidad y devuelve el foco al cerrarse.

La [apariencia](../../../../../src/shared/ui/theme-toggle.tsx) es un selector compacto con icono, borde y superficie. Ofrece claro, oscuro y sistema, se conserva en el acceso y se guarda mediante el proveedor de tema; el cambio de tema evita animar la transición global.

### Review pipeline

Una [franja de tres tramos conectados](../../../../../src/widgets/dashboard/ReviewPipeline.tsx), con un único borde y radio exterior. Cada tramo enlaza a su cola filtrada y muestra su recuento real. La revisión pendiente usa el plano grafito y cifra dorada; los otros tramos usan papel. Mantiene tres columnas, alturas mínimas de (120 px) y (140 px) desde `md`, y cifras (32/40 px); en poco espacio se ocultan iconos y enlaces auxiliares visuales, conservando etiquetas y destinos accesibles.

### Evidence and report

Las fotografías proceden de adjuntos de auditoría, cerca de su respuesta y con estados de ausencia o error; la ilustración de acceso no representa evidencia. El archivo original [Daylight Section](../../../../../public/images/daylight-section.webp) pesa (157 410 bytes) y conserva su [prompt exacto y fecha](../../../../../public/images/daylight-section.webp.json).

La [vista previa de informe](../../../../../src/features/audits/ui/ReportPreview.tsx) es una isla documental: papel blanco, Source Sans 3, formato y paleta originales, independientemente del tema. Sus estilos pertenecen al informe y no sustituyen los tokens operativos anteriores.

## Do's and Don'ts

### Do:

- **Do** usar los roles compartidos de color y sus variantes de tema; mantener grafito en la navegación.
- **Do** conservar Chakra Petch inclinada en página y marca, con lectura recta en formularios y datos.
- **Do** mantener alturas mínimas de control, foco visible y estados expresados con texto.
- **Do** separar filas con reglas, mostrar evidencias reales junto a respuestas y conservar el informe blanco.
- **Do** mantener la procedencia del raster original de acceso junto a su archivo.

### Don't:

- **Don't** usar el dorado claro como texto pequeño sobre papel; usar el ocre de lectura del tema.
- **Don't** aplicar la inclinación de los títulos a campos ni datos de tabla.
- **Don't** extender sombras de superposición a paneles y filas del espacio operativo.
- **Don't** teñir el informe con los colores del tema ni convertir la ilustración de marca en evidencia de auditoría.
