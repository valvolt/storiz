FROM node:latest

RUN mkdir -p /storiz/.node-persist/storage
RUN chmod 777 /storiz/.node-persist/storage

RUN git clone https://github.com/valvolt/storiz
WORKDIR /storiz
RUN npm install
USER node
ENTRYPOINT ["node","server/server.js"]

