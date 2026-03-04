# Builder
FROM node:lts AS builder
LABEL org.opencontainers.image.url=https://github.com/Past0ri/synapse-admin org.opencontainers.image.source=https://github.com/Past0ri/synapse-admin
# Base path for synapse admin
ARG BASE_PATH=./

WORKDIR /src

# Install dependencies from local fork (npm)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build -- --base=$BASE_PATH

# App
FROM nginx:stable-alpine

COPY --from=builder /src/dist /app

RUN rm -rf /usr/share/nginx/html \
 && ln -s /app /usr/share/nginx/html
