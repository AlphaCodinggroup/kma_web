# Segunda dirección visual: espacio de trabajo empresarial

Autorización: continuación del plan aprobado, con pedido expreso de Pablo de estudiar referencias premium e instalar/aplicar skills de diseño, frontend y UX. Se conserva el alcance funcional; se reemplaza la composición rechazada.

## Referencias observadas
- Catalyst, https://catalyst-demo.tailwindui.com/: superficie principal continua, navegación neutra, métricas divididas por reglas y tablas con ritmo legible.
- Untitled UI, https://untitledui.com/react/components/dashboards: títulos claros, controles alineados y barra lateral con selección discreta. Sólo previews públicos; no código de pago.
- Attio, https://attio.com/: bordes delicados, estructura de espacio de trabajo y tipografía firme en la demostración pública. La portada comercial no se traslada al dashboard.
- TailAdmin, https://demo.tailadmin.com/: referencia secundaria de consistencia de controles; se descarta su composición de tarjetas/gráficos porque repite el problema y KMA no tiene series de datos.

Skills instaladas: Impeccable 4.5.0 (pbakaus/impeccable), UI/UX Pro Max (nextlevelbuilder/ui-ux-pro-max-skill) y Vercel React Best Practices 1.0.0 (vercel-labs/agent-skills). El resultado automático de UI/UX Pro Max proponía un hero comercial: se descarta esa estructura por incompatibilidad con una aplicación operativa.

## Contrato visual congelado
- Una sola voz tipográfica Manrope, alojada localmente, pesos 400/500/600/700; lectura de datos 13–14 px, títulos 26–28 px y secundarios 16 px.
- Superficie principal blanca en claro, gris carbón en oscuro; fondo y navegación neutros, acento petróleo para acciones y selección. Evitar teñir todo de azul.
- Tokens existentes --kma-* conservados, más --kma-nav, --kma-selected y --kma-canvas. Sin nuevos colores literales dentro de componentes.
- Espacio de trabajo continuo con bordes delicados, radios 8 px en controles/12 px en paneles. Sin sombras debajo de cada tarjeta.
- Encabezados sin etiquetas mayúsculas decorativas; título, explicación concreta y acción alineada. Agrupar información relacionada; dejar separación entre secciones.
- Tablas como protagonista: encabezado tenue, identidad principal firme, metadatos discretos, acciones consistentes, pie integrado. Mantener los labels accesibles y contratos de interacción.
- Dashboard: bloque dominante para revisiones pendientes con acción real, estados secundarios en filas y métricas de cartera compactas separadas por reglas. Actividad reciente legible con datos reales. Nada de gráficos inventados.
- Login: composición dividida, identidad y explicación del recorrido a la izquierda, formulario contenido a la derecha; móvil prioriza formulario.
- Editor y revisión: barra de herramientas estable, columna lateral clara y superficie de trabajo diferenciada; documento PDF intacto.

## Partición y comprobación
Raíz: estilos, tipografía y componentes compartidos. Shell: navegación, dashboard y login. Gestión: proyectos, instalaciones, detalle, usuarios y flujos. Auditorías: listados, reportes y entorno de revisión. Ningún agente edita archivos compartidos ni contratos del backend.
Se conserva la suite de comportamiento existente. Revisión visual en un lote escritorio/móvil y ambos temas, corrección conjunta y una confirmación. Verificación nativa y E2E completos al terminar.
