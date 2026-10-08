---
name: KMA Workspace
description: Sistema visual empresarial para proyectos, revisión de auditorías e informes.
colors:
  primary: "#0b7078"
  primary-dark: "#79d6cd"
  background: "#f6f7f8"
  surface: "#ffffff"
  foreground: "#20272e"
  muted: "#59656f"
  border: "#e1e5e8"
  selected: "#e1efed"
  background-dark: "#15191e"
  surface-dark: "#1b2026"
  foreground-dark: "#edf0f3"
  muted-dark: "#a9b3bd"
  border-dark: "#343c45"
  selected-dark: "#253c3b"
typography:
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 600
rounded:
  control: "8px"
  panel: "12px"
spacing:
  tight: "8px"
  group: "16px"
  section: "24px"
  desktop: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
---

## Overview
Un espacio de trabajo continuo, preciso y tranquilo. Las tareas, estados y datos reales organizan cada pantalla; el acento petróleo señala acciones y selección. La referencia es la calidad de aplicaciones empresariales como Catalyst y Untitled UI, con composición propia para auditorías.

## Colors
`app/globals.css` es la fuente normativa de los colores `--kma-*`. Superficies neutras y contraste de texto consistente en ambos temas. Los tonos de éxito, advertencia, información y error conservan significado; los componentes usan tokens, sin paletas locales.

## Typography
Manrope local para la aplicación. Escala contenida de 12, 14, 16, 20 y 28 px. Peso firme para identidad y títulos, metadatos discretos y cifras tabulares. El documento impreso conserva Source Sans 3 y sus colores blancos originales mediante `.report-paper`.

## Layout
Navegación de 248 px y cabecera de 64 px; la superficie principal se adapta a móvil. Listados continuos con búsqueda, filtros, tabla y paginación relacionados. Dashboard prioriza revisión pendiente; métricas de cartera acompañan la tarea. En móvil, los paneles de navegación y pasos usan diálogos accesibles.

## Elevation & Depth
Separación por tonos y bordes. Reservar sombras para diálogos y elementos que se superponen; evitar sombra bajo cada panel.

## Shapes
Controles con esquinas de 8 px y paneles de 12 px. Badges pequeños con texto legible. Sin grandes píldoras para filas de navegación.

## Components
Conservar las interfaces compartidas y los comportamientos de foco, cargas, errores y operaciones pendientes. Formularios con etiquetas visibles y mensajes cercanos. Acciones críticas con confirmación. Tablas desplazables dentro de su contenedor. Tema persistente también en login.

## Do's and Don'ts
Usar datos reales, estados comprensibles y controles consistentes. Evitar gráficos de tendencias sin datos, etiquetas decorativas sobre títulos, tarjetas dentro de tarjetas y fondos totalmente teñidos de azul. Conservar el formato real del PDF y las funciones existentes.
