FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

# Install with increased timeout and retry logic
RUN npm config set fetch-timeout 120000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main.js"]
