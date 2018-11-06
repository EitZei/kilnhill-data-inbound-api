FROM node:8

RUN mkdir -p /app
WORKDIR /app

COPY package.json /app/
COPY yarn.lock /app/

RUN yarn install --production=true

COPY index.js /app/
COPY lib/ /app/lib

CMD ["yarn", "start"]
