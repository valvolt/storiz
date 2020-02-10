FROM node:0.10
RUN apt-get update
RUN apt-get install -y curl

# Workaround for TAR problem: https://github.com/coreos/bugs/issues/1095
RUN apt-get install -y bsdtar && ln -sf $(which bsdtar) $(which tar)

# Install meteor
RUN curl https://install.meteor.com/ | /bin/sh

# Create and change dir
RUN mkdir /opt/storiz
WORKDIR /opt/storiz/

# Copy some stuff, but public/ and private/ will be mounted
COPY package*.json ./
ADD .meteor ./.meteor
ADD client ./client
ADD imports ./imports
ADD server ./server

# Install app
RUN meteor npm install
RUN meteor npm install --save uuid

# Run meteor
EXPOSE 3000
CMD meteor --allow-superuser

# Build with
# docker build --no-cache -t storiz .

# Run with (Win PowerShell)
# docker run -d -p 80:3000 --name storiz --mount type=bind,source=${PWD}\private,target=/opt/storiz/private --mount type=bind,source=${PWD}\public,target=/opt/storiz/public storiz:latest

# Other docs:
# https://medium.com/@levente.balogh/deploy-meteor-with-docker-4d251e7916fe
