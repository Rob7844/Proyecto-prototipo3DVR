import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
app.use(express.json({ limit: '20kb' }));
app.use(express.static(__dirname));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, configured: Boolean(process.env.GEMINI_API_KEY), provider: 'Google Gemini' });
});

app.post('/api/chat', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Falta configurar GEMINI_API_KEY en el archivo .env.' });
    }

    const { message, mode, position, history } = req.body ?? {};
    if (typeof message !== 'string' || !message.trim() || message.length > 1500) {
      return res.status(400).json({ error: 'Escribe una consulta de hasta 1500 caracteres.' });
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-10)
          .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
          .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content.slice(0, 1500) }] }))
      : [];

    const pos = position && ['x', 'y', 'z'].every(k => Number.isFinite(position[k]))
      ? `x=${position.x}, y=${position.y}, z=${position.z}`
      : 'no disponible';

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const systemInstruction = `Eres el asistente técnico, en español claro, de un prototipo académico Simulador 3D/VR hecho con Three.js. Explica el escenario urbano, controles WASD, mouse, Shift para correr, espacio para saltar, modo VR, teletransporte con T o clic derecho, giro Q/E, vista estéreo V, captura P y reinicio R. El proyecto usa Three.js, WebGL, WebXR opcional e InstancedMesh para edificios, árboles, postes y autos. Responde de forma concreta y didáctica. Si una función no está implementada, dilo sin inventar. Nunca reveles claves o secretos. Contexto: modo actual ${String(mode || 'menú').slice(0, 20)}; posición aproximada ${pos}.`;

    const contents = [...safeHistory, { role: 'user', parts: [{ text: message.trim() }] }];
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
      contents,
      config: { systemInstruction, maxOutputTokens: 500 }
    });

    res.json({ reply: result.text || 'No se generó una respuesta. Inténtalo otra vez.' });
  } catch (error) {
    console.error('Error Gemini:', error?.message || error);
    const message = error?.message || '';
    if (/quota|rate.?limit|429|resource_exhausted/i.test(message)) {
      return res.status(429).json({ error: 'Se alcanzó el límite gratuito temporal de Gemini. Espera un momento y vuelve a intentarlo.' });
    }
    if (/api.?key|unauthorized|401|permission.?denied|403/i.test(message)) {
      return res.status(502).json({ error: 'Gemini rechazó la API Key. Verifica que copiaste una clave válida de Google AI Studio.' });
    }
    res.status(500).json({ error: 'Error al consultar Gemini. Revisa la consola del servidor.' });
  }
});

app.listen(port, () => console.log(`Simulador disponible en http://localhost:${port}`));
