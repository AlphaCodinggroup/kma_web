# Corrección de la ilustración de Dark

Pablo pidió integrar la ilustración del login con el tema oscuro y conservar Light.

- [x] Variante nocturna con fondo transparente; la imagen original Light conserva exactamente sus bytes.
- [x] La selección manual Dark funciona aunque el sistema operativo esté en Light. La clase del documento controla las dos imágenes, sin depender del tema del sistema.
- [x] Chrome local, compilación de producción en `http://localhost:3001`: 390, 768 y 1440 px, ambos temas, sin desbordamiento horizontal; campos móviles de 16 px y 350 px de ancho a 390 px.
- [x] Las dos imágenes cargan; únicamente la variante correspondiente resulta visible en escritorio. El panel ilustrado se oculta en móvil y tablet como antes.
- [x] `npm run verify`: lint, tipos, 3.377 tests y compilación aprobados. Evidencia: [verify.log](verify.log).
- [x] Nueve pruebas existentes de login y formulario aprobadas: [login-tests.log](login-tests.log).

Capturas específicas: `login-{light,dark}-{390,768,1440}.png`. Las 66 capturas y los 46 recorridos de la entrega integral anterior se conservan como evidencia de esa ronda; esta revisión posterior se limita al login.

La imagen es ilustración de marca, no evidencia de auditoría. El archivo y la procedencia están en `public/images/daylight-section-dark.webp` y su sidecar JSON. La comprobación pública del nuevo despliegue se registra en el PR #77 al finalizar Amplify.
