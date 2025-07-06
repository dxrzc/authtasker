# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.16.0-alpine3.21@sha256:4437d7c27c4b9306c577caa17577dc7b367fc320fb7469dbe2c994e23b11d11c

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
RUN mkdir logs && chown -R node:node logs
USER node
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "./dist/app.js"]


