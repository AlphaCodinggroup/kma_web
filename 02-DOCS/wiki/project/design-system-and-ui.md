# Sistema de diseño y UI

Fuentes: [`DESIGN.md`](../../../DESIGN.md) (dirección "KMA Daylight Section"), [`PRODUCT.md`](../../../PRODUCT.md),
[`app/globals.css`](../../../app/globals.css), [`app/layout.tsx`](../../../app/layout.tsx) y
[`src/shared/ui`](../../../src/shared/ui). Historia del rediseño: [especificación](../sdd/kma-redesign/spec.md),
[plan](../sdd/kma-redesign/plan.md), [entrega](../sdd/kma-redesign/delivery.md).

## Qué rama contiene qué (verificado con git)

| Hecho | Evidencia |
| --- | --- |
| La rama actual contiene el rediseño Daylight / `new-ui` | `git merge-base --is-ancestor new-ui HEAD` verdadero; HEAD va 4 commits por delante (`2f55f89`, `6b74134`, `9d24da6`, `8b27268`) |
| `main` y `develop` no contienen `new-ui` | ni `new-ui` ni HEAD son ancestros de `main`, `develop`, `origin/main`, `origin/develop` |
| `main` no tiene `theme-provider.tsx`, `theme-toggle.tsx` ni `features/catalog` | `git cat-file -e` falla en `main` y `develop`; `main` sí tiene `globals.css` con 32 apariciones de `--kma-` y ninguna de `--ks-` |
| Worktree `.worktrees/new-ui` existe (rama `new-ui`) | `git branch`; no se revisó su contenido más allá del ancestro |

Conclusión (CONFIRMADO): tokens `--ks-*`, tema claro/oscuro/sistema y el catálogo existen en esta rama y no
en `main`/`develop`. `DESIGN.md` exige comparar cada pantalla con la versión de `main` en producción.

## Tokens

- Dos niveles en `globals.css`: primitivos `--ks-*` (paleta Kinpaku en OKLCH: `--ks-brand-red` `#e2231a`,
  `--ks-paper*`, `--ks-ink`, `--ks-text*`, `--ks-instrument*`, `--ks-focus-ring`) y alias semánticos
  `--kma-*` que consumen los componentes (`--kma-bg`, `-fg`, `-surface`, `-subtle`, `-muted`, `-border`,
  `-nav`, `-primary`, `-primary-contrast`, `-selected`, `-selected-edge`, `-ring`, `-link`, estados
  `-danger|warning|success|info` con `-bg` y `-border`, `-input*`, `-control-height`, `-motion-*`,
  `-shadow`, `-overlay`).
- Tailwind 4: `@theme inline` solo mapea `--color-background|foreground|muted|primary|border|ring` a
  `--kma-*`. El resto de los componentes usa `var(--kma-*)` en clases arbitrarias (`bg-[var(--kma-nav)]`).
- Variante custom `fine-desktop`: `(min-width: 1024px) and (hover: hover) and (pointer: fine)`.
- Clases utilitarias propias en `globals.css`: `kma-theme-panel`, `kma-nav-link`, `kma-control-button`,
  `kma-modal-panel`, `kma-review-stage`, `container-app` (máx. 1440 px), `.btn`, `.input`.

## Temas y tipografía

- [`theme-provider.tsx`](../../../src/shared/ui/theme-provider.tsx): `next-themes` con `attribute="class"`
  (clase `.dark`), `defaultTheme="system"`, `storageKey="kma-appearance"`. `theme-toggle.tsx` ofrece
  Light/Dark/System (`aria-label="Appearance"`).
- Fuentes locales vía `next/font/local` en `app/layout.tsx`: Alumni Sans (`--font-display`, página y
  marca), Albert Sans (`--font-heading` y `--font-reading`, lectura y controles), Source Sans 3
  (`--font-reporting`, informe/PDF blanco independiente del tema). `public/fonts` también trae
  Chakra Petch y Manrope sin referencia en `layout.tsx` (INFERIDO: restos de iteraciones previas).

## Componentes compartidos (`src/shared/ui`)

`badge`, `brand-mark`, `card`, `collapsible`, `confirm-dialog`, `confirm-title`, `controls` (Button, Input,
Label, etc.), `dropdown-menu` (Radix), `filter-select`, `Loading`, `mobile-entity-row`, `modal` (Radix
dialog; tests de foco), `page-header`, `Pagination`, `progress`, `Retry`, `row-action-button`,
`search-input`, `table`, `table-header`, `tabs` (Radix), `theme-provider`, `theme-toggle`, `tooltip`.
Casi todos tienen test en `__tests__`. Iconos: `lucide-react`.

## Responsive

CONFIRMADO en código:

- Corte principal de la app: **1023/1024 px**. La navegación lateral es `hidden lg:flex`; por debajo se
  abre como diálogo desde la cabecera. Las tablas pasan a filas móviles (`MobileEntityRow`) con
  `useMediaQuery("(max-width: 1023px)")` en audits, facilities, reports y users.
- A menos de 1024 px o con puntero táctil, `--kma-control-height` sube a 44 px y los inputs usan 16 px
  (evita zoom en iOS) en [`globals.css`](../../../app/globals.css).
- Editor de flows: la tabla y el inspector conviven desde **`xl` (1280 px)**; por debajo, la tabla se
  sustituye por el botón "Browse steps" y el inspector ocupa todo el ancho
  ([`FlowEditor.tsx`](../../../src/features/flows/ui/FlowEditor.tsx), `xl:hidden` y `hidden ... xl:flex`).
  Cambio de ancho del inspector: flow-inspector-width (sin comprobar en
  navegador). Nota: `DESIGN.md` aún describe el inspector de 340 a 480 px y `flex-3/flex-2`, anterior a
  ese cambio (CONTRADICCION menor con el código sin commitear).
- Login: dos columnas desde `lg`; por debajo se oculta la ilustración.

## Accesibilidad

- CONFIRMADO: foco visible global (`:focus-visible`, contorno de 2 px con `--ks-focus-ring`), respeto a
  `prefers-reduced-motion` en `globals.css`, `eslint-plugin-jsx-a11y` activo con reglas en `warn`
  (`alt-text`, `anchor-is-valid`, `label-has-associated-control`) y `--max-warnings 0` en `npm run lint`
  (por tanto fallan igual).
- CONFIRMADO: mensajes de estado con `role="alert"`/`role="status"` en páginas de audits, reports, flows y
  dashboard; botones de icono con `aria-label` y `title`; `aria-current="page"` y `aria-busy` en la navegación.
- CONFIRMADO: Playwright incluye comprobaciones axe WCAG 2.0 a 2.2 AA en
  [`e2e/premium.spec.ts`](../../../e2e/premium.spec.ts) y `e2e/catalog.spec.ts`.
- NO VERIFICADO: cumplimiento real (no se ejecutó axe ni el navegador en este escaneo); contraste del rojo de
  marca sobre fondos oscuros, que `DESIGN.md` limita a texto grande.
- Roles solo deshabilitan controles (`disabled`, `title="Only administrators can ..."`); no son
  autorización ([auth-and-session.md](auth-and-session.md)).
