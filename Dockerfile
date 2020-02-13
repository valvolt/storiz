FROM node:0.10
RUN apt-get update
RUN apt-get install -y curl

# Workaround for TAR problem: https://github.com/coreos/bugs/issues/1095
RUN apt-get install -y bsdtar && ln -sf $(which bsdtar) $(which tar)

# Avoid using root
RUN groupadd -g 777 appuser && useradd -r -m -u 777 -g appuser appuser
USER appuser
ENV HOME /home/appuser

# Install meteor
RUN curl https://install.meteor.com/ | /bin/sh
ENV PATH="/home/appuser/.meteor:${PATH}"

# Create and change dir
RUN mkdir /home/appuser/storiz
WORKDIR /home/appuser/storiz/

# Copy some stuff, but public/ and private/ will be mounted
COPY package*.json ./
ADD --chown=appuser:appuser .meteor ./.meteor
ADD client ./client
ADD imports ./imports
ADD server ./server

# Install app
RUN meteor npm install
RUN meteor npm install --save uuid

# Run meteor
EXPOSE 3000
CMD meteor

# Build with
# docker build --no-cache -t storiz .

# Save and load with
# docker save -o ${PWD}/storiz_latest.tgz storiz
# docker load -i storiz_latest.tgz

# Run with (Win PowerShell)
# docker run -d -p 80:3000 --name storiz --mount type=bind,source=${PWD}\private,target=/home/appuser/storiz/private --mount type=bind,source=${PWD}\public,target=/home/appuser/storiz/public storiz:latest

# Other docs:
# https://medium.com/@levente.balogh/deploy-meteor-with-docker-4d251e7916fe
