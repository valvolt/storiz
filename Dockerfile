FROM node:latest

RUN git clone https://github.com/valvolt/storiz
WORKDIR /storiz/server
RUN npm install
USER node
ENTRYPOINT ["node","server.js"]

