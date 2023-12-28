FROM node:latest
RUN git clone https://github.com/valvolt/storiz
RUN chmod 777 /storiz/persistence
WORKDIR /storiz
RUN npm install
USER node
ENTRYPOINT ["node","server/server.js"]
