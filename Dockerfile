FROM node:latest
RUN git clone https://github.com/valvolt/storiz
RUN mkdir -p /storiz/.node-persist/storage
RUN chmod 777 /storiz/.node-persist/storage
WORKDIR /storiz
RUN npm install
USER node
ENTRYPOINT ["node","server/server.js"]
