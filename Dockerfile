FROM node:8.6-alpine

RUN apk update && apk add git

RUN mkdir app

ADD . app/

RUN cd app && npm install
RUN npm install -g ember-cli@3.1.4
RUN npm install -g bower


EXPOSE 4200/tcp

WORKDIR app/

ENTRYPOINT ["ember", "serve"]
