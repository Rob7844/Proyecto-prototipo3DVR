# Simulador 3D / VR conectado a OpenAI

## Requisitos
- Node.js 18 o superior.
- API key de OpenAI activa y con facturación/crédito disponible.

## Instalación en Windows (PowerShell)
1. Descomprime el ZIP y abre `Trabajo 01 Semana` en VS Code.
2. Abre la terminal en esa carpeta y ejecuta:
   ```powershell
   npm install
   Copy-Item .env.example .env
   ```
3. Abre `.env` y reemplaza `pega_aqui_tu_api_key` por tu clave secreta.
4. Inicia el servidor:
   ```powershell
   npm start
   ```
5. Abre `http://localhost:3000` en Chrome o Edge. No abras `index.html` directamente ni uses Live Server.
6. Pulsa **Asistente IA** abajo a la derecha y escribe una pregunta.

## Integración
- Chat dentro de la interfaz del simulador.
- Backend Node.js + Express en `server.js`.
- Endpoint `POST /api/chat` que usa el SDK oficial de OpenAI y Responses API.
- Modelo predeterminado `gpt-4.1-mini`, configurable con `OPENAI_MODEL`.
- Se envía el modo FPS/VR y la posición aproximada para contextualizar respuestas.
- La API key solo se lee en el servidor. No se incluye en el frontend.

## Comprobación
Abre `http://localhost:3000/api/health`. `configured: true` indica que el servidor detectó la clave, pero debes enviar un mensaje para probar la conexión real.

## Seguridad y costos
OpenAI cobra según el uso de la API y la cuenta asociada a la clave. No pegues la clave en `app.js` o `index.html`, no compartas el `.env` ni lo subas a GitHub. Para publicar el prototipo, añade autenticación y límites de solicitudes.
