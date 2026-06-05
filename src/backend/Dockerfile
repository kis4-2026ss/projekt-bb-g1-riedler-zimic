FROM node:lts-alpine

WORKDIR /home/node/wishlist

COPY package.json .
COPY app.mjs .
COPY server.mjs .

RUN npm install

CMD [ "npm", "start" ]

EXPOSE 3000
