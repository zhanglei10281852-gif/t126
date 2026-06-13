FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=7763
EXPOSE 7763

CMD ["node", "src/server.js"]
