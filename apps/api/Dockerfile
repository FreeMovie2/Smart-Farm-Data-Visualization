FROM node:20-alpine
WORKDIR /app

COPY apps/api/package.json apps/api/package.json

RUN npm install --prefix apps/api

COPY apps/api apps/api

ENV DB_HOST=db
ENV DB_PORT=5432
ENV DB_NAME=smart_farm
ENV DB_USER=postgres
ENV DB_PASSWORD=postgres

EXPOSE 4000
CMD ["npm", "run", "--prefix", "apps/api", "start:dev"]
