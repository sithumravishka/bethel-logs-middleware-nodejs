FROM node:22.13.1-alpine

WORKDIR /app

COPY services/logger-service/package.json services/logger-service/package-lock.json ./
RUN npm install

COPY common-protos /common-protos

COPY services/logger-service/src ./src

COPY .env ./

EXPOSE 50055

CMD ["npm", "start"]