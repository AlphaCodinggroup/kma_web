# FTD: Corrección de scrolls anidados y estabilización del layout (new-ui)

## Intent
Eliminar los scrolls dobles y anidados en la navegación y pantallas clave de la nueva UI:
1. Eliminar el scroll innecesario en el menú lateral (`SidebarNav`) para que quede fijo.
2. Eliminar el scroll del contenedor exterior `<main>` en el editor de flows (`FlowEditor`), manteniendo fija la cabecera y el formulario de guardado, con scroll exclusivamente en los paneles internos.
3. Eliminar el doble scroll vertical en `AuditsTable` para que la página de auditorías tenga un único scroll unificado.

## Scope
- `src/widgets/shell/SidebarNav.tsx`: Compactar espaciados verticales para que todos los enlaces y Logout quepan sin activar scroll en resoluciones estándar.
- `src/features/flows/ui/FlowEditor.tsx`: Ajustar la altura en `xl:` eliminando `min-h-[650px]` que forzaba el scroll de `<main>`.
- `src/features/flows/ui/FlowStepsTable.tsx`: Ajustar el ancho mínimo de la tabla (`min-w-[620px]`) y columnas para evitar scroll horizontal innecesario.
- `src/features/audits/ui/AuditsTable.tsx`: Reemplazar el `overflow-auto` con `max-h-dvh` por defecto por `overflow-x-auto` para que la vista de auditorías tenga un único scroll vertical de página.
- `src/features/audits/ui/__tests__/AuditsTable.test.tsx`: Actualizar el test del contenedor de scroll.

## 2-Scroll Studio Architecture in Flow Editor (Main branch parity)
Tras evaluar con el usuario la experiencia del editor de flows:
1. **AppShell (`src/widgets/shell/AppShell.tsx`)**:
   - Raíz fija a `h-dvh flex flex-col overflow-hidden` y contenedor interno `flex min-h-0 flex-1`.
   - `SidebarNav` y `AppHeader` quedan 100% fijos sin desplazarse jamás fuera de la pantalla.
2. **Eliminación del scroll exterior y del espacio gris (`FlowEditor.tsx`, `page.tsx`)**:
   - `PageHeader` se declara `sr-only` en `/flows/[id]` y `/flows/new` para evitar duplicar el título y ahorrar ~70px de espacio vertical innecesario.
   - `FlowEditor` utiliza `h-[calc(100dvh-130px)] min-h-0 min-w-0 flex flex-col gap-3`, encajando exactamente en el alto del viewport.
   - Al no desbordar `<main>`, el scroll principal de la página **desaparece por completo** y no hay ningún espacio gris inferior.
3. **Exactamente dos scrolls internos**:
   - **Scroll 1 (Centro)**: La tabla de pasos (`FlowStepsTable`) tiene `min-h-0 flex-1 overflow-auto` para navegar los 29+ pasos.
   - **Scroll 2 (Derecha)**: El inspector de detalles del paso (`StepDetailInspector`) tiene `min-h-0 flex-1 overflow-y-auto` para editar campos, fotos y opciones.
   - La barra de herramientas superior (Título, Unsaved changes, Discard, Export, Save Flow) permanece siempre visible en la parte superior.

## Checklist
- [x] Fijar `AppShell` (`h-dvh flex flex-col overflow-hidden`) para que nunca scrolee la ventana ni desplace el header/sidebar.
- [x] Compactar `SidebarNav` y desactivar scroll en escritorio (`lg:overflow-y-hidden`).
- [x] Eliminar scroll de página en `/flows/[id]` ajustando `FlowEditor` a `h-[calc(100dvh-130px)] min-h-0`.
- [x] Ocultar título duplicado `PageHeader` con `sr-only` en `/flows/[id]` y `/flows/new`.
- [x] Configurar `StepDetailInspector` con `h-full min-h-0` y `overflow-y-auto` interno.
- [x] Configurar `FlowStepsTable` con `h-full min-h-0` y `overflow-auto` interno.
- [x] Optimizar ancho y columnas en `FlowStepsTable` (`min-w-[620px]`).
- [x] Ajustar `AuditsTable` para evitar doble scroll vertical (`overflow-x-auto`).
- [x] Ejecutar lint, typecheck y suite completa de tests de shell y flows (268 tests).

## Evidence
- `npm run typecheck`: exit 0 (0 errores).
- `npm run lint`: exit 0 (0 errores).
- `vitest run src/widgets/shell/__tests__/ src/features/flows/ui/__tests__/ "app/(dashboard)/flows"`: 268 pasados de 268 (19 archivos de prueba).

