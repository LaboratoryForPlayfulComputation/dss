FROM node:10

ENV work /app
RUN mkdir ${work}

ADD ./common ${work}/common
ADD ./server ${work}/server

WORKDIR ${work}

EXPOSE 4000

CMD node server/dist/bin/simple_server.js
