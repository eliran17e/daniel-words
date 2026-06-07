FROM node:20-alpine

WORKDIR /app

ENV CI=true     CHOKIDAR_USEPOLLING=true     WATCHPACK_POLLING=true     WDS_SOCKET_PORT=0     HOST=0.0.0.0     PORT=3000

COPY package.json ./
RUN npm install --no-audit --no-fund --loglevel=error

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
