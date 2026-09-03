FROM node:22-alpine AS base
RUN npm install -g pnpm@10.33.0

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @partytube/database db:generate
RUN pnpm --filter @partytube/shared-types build
RUN pnpm --filter @partytube/backend build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app
EXPOSE 3001
CMD ["pnpm", "--filter", "@partytube/backend", "start:prod"]
