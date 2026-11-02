# Publicación de la rama new-ui

Pablo autorizó abrir un PR y desplegar el frontend en `new-ui`, sin fusionar ni publicar cambios en `main`.

## Destino

- Repositorio: `AlphaCodinggroup/kma_web`.
- Rama: `new-ui`; PR contra `main`, sin fusión automática.
- Servicio: AWS Amplify Hosting, aplicación existente `kma_web`, identificador `d3mbp3kh3ub3q9`.
- Región: `us-east-2` — Ohio.
- Plataforma: `WEB_COMPUTE`, Next.js SSR.
- URL: https://new-ui.d3mbp3kh3ub3q9.amplifyapp.com.
- Configuración reproducible de la nueva rama: [amplify-new-ui.json](../../../../../01-TOOLS/deploy/amplify-new-ui.json).

La rama hereda las variables y el backend configurados en la aplicación existente. No se copian credenciales al repositorio ni se cambia la configuración de la rama principal. Se conserva el archivo `amplify.yml` existente.

## Evidencia previa

El frontend publicado conserva los archivos de aplicación probados en el worktree original. `npm run verify`: 3.377 tests, tipos y compilación aprobados; 63 pruebas adicionales tras la corrección de cabeceras. Chromium: 46 recorridos aprobados, 66 capturas y 66 escenarios Axe sin infracciones detectadas. [Entrega local y límites](validation/entrega.md).

## Despliegue y reversión

Crear la rama de hosting una sola vez con `aws amplify create-branch --region us-east-2 --cli-input-json file://01-TOOLS/deploy/amplify-new-ui.json`. La configuración versionada define únicamente la rama pedida.

Publicar `new-ui` en GitHub y ejecutar `aws amplify start-job --region us-east-2 --app-id d3mbp3kh3ub3q9 --branch-name new-ui --job-type RELEASE`. Antes de iniciar manualmente, comprobar que el push no haya iniciado ya un trabajo automático, para evitar despliegues duplicados.

Durante el primer despliegue, la reversión disponible consiste en detener ese trabajo con `aws amplify stop-job --region us-east-2 --app-id d3mbp3kh3ub3q9 --branch-name new-ui --job-id <id>`. No existe una publicación anterior de `new-ui` que restaurar. Si falla la publicación, corregir esta rama y desplegarla de nuevo; `main` permanece independiente.

En publicaciones futuras, para volver a una compilación previamente correcta de esta misma rama, usar `aws amplify start-job --region us-east-2 --app-id d3mbp3kh3ub3q9 --branch-name new-ui --job-type RETRY --job-id <id-correcto>`. Confirmar antes el identificador y el commit de ese trabajo.

## Comprobación pública

Esperar a que Amplify confirme éxito en compilación y publicación del commit de `new-ui`; comprobar HTTPS, página de login, recursos de fuentes e imagen, ambos temas y consola en Chrome. Los recorridos locales con datos sintéticos no se repetirán sobre datos del backend publicado.

Publicación inicial confirmada: [PR #77](https://github.com/AlphaCodinggroup/kma_web/pull/77), commit `0c884c27e36a95817cce878c321d83adcd96a7c4`, trabajo Amplify `1` con BUILD, DEPLOY y VERIFY en `SUCCEED`; `/login` respondió HTTPS 200. Los checks del PR también terminaron correctamente.

Pablo pidió después mejorar la imagen de Dark y autorizó pushear y desplegar esa corrección en la misma rama. La nueva variante conserva la imagen Light original; sus comprobaciones y capturas específicas quedan en `validation/dark-login/`. El trabajo siguiente debe validarse antes de dar esta actualización por publicada.
