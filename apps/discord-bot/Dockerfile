FROM node:20-slim

WORKDIR /app

# Install openssl (required by Prisma) and clean up
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install pnpm (pinned to 9 to match lockfileVersion 9.0)
RUN npm install -g pnpm@9

# Copy workspace config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./

# Copy package.json files for all workspace packages
COPY apps/discord-bot/package.json ./apps/discord-bot/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/permissions/package.json ./packages/permissions/
COPY packages/game-rules/package.json ./packages/game-rules/
COPY packages/tournament-engine/package.json ./packages/tournament-engine/
COPY packages/scoring/package.json ./packages/scoring/
COPY packages/payments/package.json ./packages/payments/
COPY packages/notifications/package.json ./packages/notifications/

# Copy Prisma schema BEFORE install (postinstall runs prisma generate)
COPY packages/database/prisma ./packages/database/prisma

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy all source code
COPY apps/discord-bot ./apps/discord-bot
COPY packages ./packages

# Generate Prisma client (re-run after full source copy)
RUN pnpm --filter @esports/database exec prisma generate

# Build all packages in dependency order
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
