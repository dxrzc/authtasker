# syntax=docker/dockerfile:1

# TODO: change for a safer version (might be alpine)
ARG NODE_VERSION=22.16.0-bookworm@sha256:a676f1268cf25605dbee49dcc3c73497311288da421855bdf19f25b8da6a95df

FROM node:${NODE_VERSION} AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY src ./src
COPY tsconfig*.json ./
RUN npm run build

FROM node:${NODE_VERSION} AS production
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /usr/src/app/dist ./dist
USER node
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "./dist/app.js"]


