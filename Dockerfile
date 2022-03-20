FROM node:8.6-alpine

RUN apk update && apk add git

COPY . .

RUN npm install -g ember-cli
RUN npm install -g bower
RUN npm install

EXPOSE 4200/tcp
EXPOSE 4200/udp

ENTRYPOINT ["ember", "serve"]
