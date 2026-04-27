FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml tsconfig.json ./
RUN pnpm install --no-frozen-lockfile

FROM deps AS build
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
RUN mkdir -p /app/data
EXPOSE 8080
CMD ["pnpm", "start"]
