FROM node:20-alpine
WORKDIR /app

COPY apps/worker/package.json apps/worker/package.json

RUN npm install --prefix apps/worker

COPY apps/worker apps/worker

CMD ["npm", "run", "--prefix", "apps/worker", "start:dev"]
