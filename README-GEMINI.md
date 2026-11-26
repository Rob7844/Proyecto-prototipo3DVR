# Simulador 3D/VR con Google Gemini API (nivel gratuito)

## 1. Crear una API Key
1. Abre https://aistudio.google.com/apikey
2. Inicia sesión con tu cuenta Google.
3. Crea una API Key y cópiala. No la compartas ni la coloques en archivos del navegador.

## 2. Configurar el proyecto
En la carpeta donde está `package.json`, crea un archivo llamado `.env` (no `.env.txt`) con:

```env
GEMINI_API_KEY=PEGA_AQUI_TU_CLAVE
GEMINI_MODEL=gemini-3.1-flash-lite
PORT=3000
```

Reemplaza el texto de ejemplo por tu clave real. No uses comillas.

## 3. Instalar y ejecutar
Requiere Node.js 22 o posterior para la versión actual del SDK de Google Gen AI.

```bash
npm install
npm start
```

Abre http://localhost:3000

## 4. Comprobar configuración
Abre http://localhost:3000/api/health. Debe mostrar `ok: true` y `configured: true`.

## Notas
- El servidor usa Google Gemini, no OpenAI. No necesitas créditos de OpenAI para este asistente.
- El nivel gratuito de Gemini tiene límites de uso y disponibilidad que pueden cambiar. Si se alcanza la cuota, espera a que se restablezca.
- Mantén `.env` privado; no lo subas a GitHub ni compartas capturas que muestren la clave.
