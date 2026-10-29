# FTD: Inspector de pasos más ancho y campos de Form apilados

## Intent
Hacer más cómodo corregir un paso en el editor de flows: el inspector (formulario embebido a la
derecha de "Flow Steps") quedaba estrecho y cada campo de un paso Form mezclaba tipo, label, unidad
y borrar en una sola fila sin rótulos.

## Scope
- `src/features/flows/ui/FlowEditor.tsx`: en `xl`, la tabla pasa a `flex-1` y el inspector a
  `w-[clamp(420px,42%,680px)] flex-none` (antes `flex-[3]`/`flex-[2]` con máximo de 480 px). Por
  debajo de `xl` no cambia: botón "Browse steps" e inspector a todo el ancho.
- `src/features/flows/ui/StepDetailInspector.tsx`: cada campo de un paso Form tiene cabecera (tipo y
  borrar) y cuerpo con rótulos visibles "Label", "Unit" (solo `measurements*`) y "Placeholder" (solo
  `text`/`number`). Se conservan `aria-label`, `title="Delete field"`, opciones de unidad y la
  estructura que usan los helpers de test.
- Sin cambios en handlers, props, modelo ni contrato con el backend.

## Checklist
- [x] Ensanchar el inspector en `xl`.
- [x] Apilar las filas de campos con rótulos visibles.
- [x] Lint de los dos archivos: exit 0.
- [x] `tsc --noEmit`: exit 0.
- [x] `npx vitest run src/features/flows app/(dashboard)/flows`: 17 archivos, 259 tests en verde.
- [ ] Comprobación en navegador a 1280, 1440 y 1920 px y por debajo de `xl` (no ejecutada).

## Evidence
- Los tests existentes no necesitaron cambios: el tipo sigue siendo `block.firstElementChild.firstElementChild`
  y el botón de borrar se encuentra por `title=/delete/i`.
- NO VERIFICADO: aspecto real en navegador, ancho efectivo del inspector y scroll de la tabla.
  El cálculo de 420/480/680 px en cada resolución es una estimación, no una medición.

## Integración en new-ui (2026-10-29)

Por pedido de Pablo se integran los historiales de #79, #80 y #81 con `new-ui`
como base. #78 ya está fusionado allí. Los conflictos se resuelven conservando
el código y la documentación más recientes: el cambio funcional de los tres PR
ya está incluido. Sólo faltaba corregir el ancho del inspector en `DESIGN.md`.
El código de aplicación resultante es idéntico al de `new-ui` (`f1cbdbd`), que ya
pasó lint, tipos, 3604 tests, cobertura y build. No se repite esa suite porque
esta integración sólo cambia documentación y registra la ascendencia Git.
