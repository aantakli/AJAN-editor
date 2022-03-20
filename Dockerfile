FROM node:8.6-alpine

RUN apk update && apk add git

COPY . .

RUN npm install && npm install -g ember-cli && npm install -g bower

EXPOSE 4200/tcp
EXPOSE 4200/udp

ENTRYPOINT ["ember", "serve"]
