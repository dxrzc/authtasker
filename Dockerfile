# syntax=docker/dockerfile:1
ARG NODE_VERSION=22.16.0-alpine3.21@sha256:4437d7c27c4b9306c577caa17577dc7b367fc320fb7469dbe2c994e23b11d11c

FROM node:${NODE_VERSION} AS base
WORKDIR /usr/src/app
EXPOSE 3000

FROM base AS dev-deps
COPY package*.json ./
RUN npm ci

FROM base AS prod-deps
COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS builder
COPY --from=dev-deps /usr/src/app/node_modules ./node_modules
COPY src ./src
COPY package.json . 
COPY tsconfig*.json ./
RUN npm run build

FROM base AS development
COPY --from=dev-deps /usr/src/app/node_modules ./node_modules
COPY src ./src
COPY tsconfig.json ./tsconfig.json
ENV NODE_ENV=development
CMD ["sh", "-c", "npx tsc --noEmit && npx tsx watch -r tsconfig-paths/register src/app.ts"]

FROM base AS production
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
RUN mkdir logs && chown -R node:node logs
USER node
ENV NODE_ENV=production
CMD ["node", "./dist/app.js"]


