FROM node:8.6-alpine

RUN apk update && apk add git

COPY . .

RUN npm install
RUN npm install ember-cli
RUN npm install bower

EXPOSE 4200/tcp
EXPOSE 4200/udp

ENTRYPOINT ["ember", "serve"]
