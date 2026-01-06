FROM node:20-alpine
WORKDIR /app

COPY apps/mock-generator/package.json apps/mock-generator/package.json
RUN npm install --prefix apps/mock-generator

COPY apps/mock-generator apps/mock-generator
RUN npm run --prefix apps/mock-generator build

CMD ["node", "apps/mock-generator/dist/index.js"]

