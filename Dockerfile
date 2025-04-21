FROM node:18-slim

WORKDIR /server

COPY package*.json ./

RUN npm ci --only=production

COPY . ./

ENV NODE_ENV=production

EXPOSE 9000

RUN adduser --disabled-password --gecos "" nodeuser
USER nodeuser

CMD ["node", "server.js"]