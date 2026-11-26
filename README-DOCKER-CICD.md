# Docker y CI/CD — Simulador 3D/VR con Google Gemini

Esta configuración está adaptada a la estructura real del proyecto. El simulador y el servidor Express se ejecutan en **un solo contenedor**, porque `server.js` ya publica los archivos estáticos (`index.html`, `app.js`, `world.js`, `player.js` y `vr.js`). No se necesitan carpetas `frontend/` y `backend/` ni un contenedor Nginx separado.

## 1. Requisitos

- Docker Desktop para Windows, con el motor iniciado.
- Docker Compose v2.
- Git y una cuenta de GitHub para CI/CD.
- Una API Key de Google AI Studio para usar el asistente Gemini.

Comprueba Docker desde PowerShell:

```powershell
docker --version
docker compose version
```

## 2. Configurar la clave de Gemini

En la carpeta principal del proyecto, crea `.env` a partir de `.env.example`:

```powershell
Copy-Item .env.example .env
```

Edita `.env` y reemplaza el valor de `GEMINI_API_KEY` por tu clave real. No compartas este archivo ni lo subas a GitHub. El archivo `.gitignore` ya excluye `.env`.

## 3. Construir y ejecutar el contenedor

Abre PowerShell en la carpeta donde se encuentra `docker-compose.yml` y ejecuta:

```powershell
docker compose up --build -d
```

Consulta el estado:

```powershell
docker compose ps
```

Consulta los registros del servidor:

```powershell
docker compose logs -f
```

Abre el simulador en:

- Aplicación: http://localhost:3000
- Estado de la API: http://localhost:3000/api/health

En `/api/health`, `configured: true` indica que el servidor detectó la variable `GEMINI_API_KEY`. Después, prueba el botón **Asistente IA** y envía una consulta para comprobar la conexión real con Gemini.

## 4. Detener el contenedor

```powershell
docker compose down
```

Para volver a iniciarlo después:

```powershell
docker compose up -d
```

## 5. Configurar GitHub Actions (CI/CD)

El archivo `.github/workflows/ci-cd.yml` ya está creado. Se ejecuta cuando haces `push` o abres un `pull request` hacia la rama `main`.

El flujo realiza estas tareas:

1. Descarga el código del repositorio.
2. Configura Node.js 22.
3. Instala las dependencias con `npm ci`.
4. Verifica la sintaxis de `server.js`.
5. Construye la imagen Docker.

No necesita la API Key para construir la imagen, porque la clave se inyecta al ejecutar el contenedor y no durante la construcción.

## 6. Subir el proyecto a GitHub

Crea primero un repositorio vacío en GitHub. Luego, desde PowerShell, en la carpeta principal del proyecto, ejecuta (reemplaza la URL):

```powershell
git init
git add .
git status
git commit -m "Proyecto: simulador 3D VR con Docker y CI/CD"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Si el proyecto ya tiene Git inicializado y un remoto configurado, no repitas `git init` ni `git remote add origin`; verifica con:

```powershell
git status
git remote -v
```

## 7. Evidencias para el informe

Toma capturas donde se observe:

1. Docker Desktop con el contenedor `simulador-3d-vr` en ejecución.
2. La terminal mostrando `docker compose ps`.
3. El simulador abierto en `http://localhost:3000`.
4. La respuesta de `http://localhost:3000/api/health` con `ok: true` y `configured: true` (no debe aparecer la clave).
5. GitHub → pestaña **Actions**, con el workflow terminado correctamente (check verde).

## 8. Solución de errores frecuentes

| Error | Posible solución |
|---|---|
| Docker daemon no está activo | Abre Docker Desktop y espera a que indique que el motor está iniciado. |
| `port is already allocated` | Cierra el proceso que ocupa el puerto 3000 o cambia el puerto del lado izquierdo en `docker-compose.yml`. |
| `npm ci` falla | Comprueba que `package-lock.json` esté en la raíz junto a `package.json`. |
| `configured: false` | Verifica que `.env` esté en la raíz y que contenga `GEMINI_API_KEY` con una clave válida. Reinicia con `docker compose down` y `docker compose up --build -d`. |
| GitHub Actions falla en `npm ci` | Comprueba que `package.json` y `package-lock.json` estén actualizados y subidos al repositorio. |
| El contenedor inicia, pero no responde Gemini | Revisa `docker compose logs -f` y verifica la validez, cuota y permisos de la API Key. |

## Nota de arquitectura

La guía original propone dos contenedores separados y menciona OpenAI. Este ZIP usa Google Gemini y un único servidor Express que entrega tanto la web como la API. Por eso, esta adaptación usa un solo contenedor Node.js en el puerto 3000. La configuración CI/CD valida el código y construye la imagen, pero no publica automáticamente la imagen en un registro ni despliega en un servidor.
