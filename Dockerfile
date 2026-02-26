FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package manifests first to leverage Docker cache
COPY package*.json ./

# Install production dependencies
ENV NODE_ENV=production
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Create an unprivileged user and ensure persistence dir is writable
RUN addgroup -S storiz && adduser -S -G storiz appuser \
  && mkdir -p /usr/src/app/persistence \
  && chown -R appuser:storiz /usr/src/app \
  && chmod -R u+rw /usr/src/app/persistence || true

# Switch to non-root user
USER appuser

# Expose default port
EXPOSE 8000

# Start the server
CMD ["node", "server/server.js"]