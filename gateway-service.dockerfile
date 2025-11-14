FROM node:22.13.1-alpine

WORKDIR /app

COPY gateway/package.json gateway/package-lock.json ./
RUN npm install

COPY common-protos /common-protos

COPY gateway/src ./src

COPY .env ./

EXPOSE 4000

CMD ["npm", "start"]