FROM node:latest

RUN git clone https://github.com/valvolt/storiz
WORKDIR /storiz/server
USER node
RUN npm install
ENTRYPOINT ["node","server.js"]

