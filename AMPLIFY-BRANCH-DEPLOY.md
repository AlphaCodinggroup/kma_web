# Deploy temporal de una rama en Amplify

## Objetivo

Deployar una rama específica (ej: `final-with-skills`) en Amplify **sin afectar** la configuración existente de `develop`. Amplify le asigna su propia URL y después se elimina la conexión.

## Pasos

### 1. Obtener el App ID

```bash
aws amplify list-apps --query "apps[].{name:name, id:appId}" --output table
```

### 2. Conectar la rama

```bash
aws amplify create-branch \
  --app-id <APP_ID> \
  --branch-name final-with-skills
```

Esto genera una URL tipo: `final-with-skills.d3mbp3kh3ub3q9.amplifyapp.com`

### 3. Lanzar el build (si no arranca solo)

```bash
aws amplify start-job \
  --app-id <APP_ID> \
  --branch-name final-with-skills \
  --job-type RELEASE
```

### 4. Ver el estado del build

```bash
aws amplify list-jobs \
  --app-id <APP_ID> \
  --branch-name final-with-skills \
  --query "jobSummaries[0].{status:status, endTime:endTime}" \
  --output table
```

### 5. Eliminar la rama cuando termines

```bash
aws amplify delete-branch \
  --app-id <APP_ID> \
  --branch-name final-with-skills
```

## Notas

- La rama `develop` **no se toca** en ningún momento.
- Las env vars se heredan del app, pero si la rama necesita valores específicos se pueden pasar con `--environment-variables` en el `create-branch`.
- Después del `delete-branch`, Amplify vuelve a su estado original como si nada hubiera pasado.
