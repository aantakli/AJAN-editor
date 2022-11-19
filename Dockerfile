FROM node:8.6-alpine

RUN apk update && apk add git

RUN mkdir app

ADD . app/

RUN cd app && npm install

EXPOSE 4200/tcp

WORKDIR app/

ENTRYPOINT ["node", "npm/node_modules/ember-cli/bin/ember", "serve"]
