# Imagen oficial de Node.js 22 (requerida por el SDK actual de Google Gen AI)
FROM node:22-alpine

WORKDIR /app

# Instalar dependencias usando el lockfile
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar el simulador y el servidor
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
