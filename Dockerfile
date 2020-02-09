FROM node:0.10
RUN apt-get update
RUN apt-get install -y curl

# Workaround for TAR problem: https://github.com/coreos/bugs/issues/1095
RUN apt-get install -y bsdtar && ln -sf $(which bsdtar) $(which tar)

# Install meteor
RUN curl https://install.meteor.com/ | /bin/sh

# Copy storiz
ADD . /opt/storiz/app
WORKDIR /opt/storiz/app/

# Install app
RUN meteor npm install
RUN meteor npm install --save uuid

# Other docs:
# https://medium.com/@levente.balogh/deploy-meteor-with-docker-4d251e7916fe
# https://stackify.com/docker-build-a-beginners-guide-to-building-docker-images/

# Run
EXPOSE 3000
CMD meteor --allow-superuser
