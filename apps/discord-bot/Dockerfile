FROM node:20-alpine

WORKDIR /app

# OpenSSL is required by Prisma on Alpine
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./

# Copy package.json files for all packages
COPY apps/discord-bot/package.json ./apps/discord-bot/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/permissions/package.json ./packages/permissions/
COPY packages/game-rules/package.json ./packages/game-rules/
COPY packages/tournament-engine/package.json ./packages/tournament-engine/
COPY packages/scoring/package.json ./packages/scoring/
COPY packages/payments/package.json ./packages/payments/

# Prisma schema must exist before install because the root postinstall runs `prisma generate`
COPY packages/database/prisma ./packages/database/prisma

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY apps/discord-bot ./apps/discord-bot
COPY packages ./packages

# Generate Prisma client
RUN pnpm --filter @esports/database exec prisma generate

# Build all packages
RUN pnpm --filter @esports/database build
RUN pnpm --filter @esports/shared-types build
RUN pnpm --filter @esports/permissions build
RUN pnpm --filter @esports/game-rules build
RUN pnpm --filter @esports/tournament-engine build
RUN pnpm --filter @esports/scoring build
RUN pnpm --filter @esports/payments build

# Build the bot
RUN pnpm --filter discord-bot build

# Start
CMD ["node", "apps/discord-bot/dist/index.js"]
