FROM node:20-alpine
WORKDIR /app

COPY apps/web/package.json apps/web/package.json
RUN npm install --prefix apps/web

COPY apps/web apps/web
EXPOSE 3000
CMD ["npm", "run", "--prefix", "apps/web", "dev"]
