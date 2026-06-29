# ----------------------------
# Stage 1: Install dependencies
# ----------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# Enable pnpm v9 (avoids pnpm v10 build approval issue)
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy dependency files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# ----------------------------
# Stage 2: Build application
# ----------------------------
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy installed dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN pnpm build

# ----------------------------
# Stage 3: Production image
# ----------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy only required files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

COPY --from=builder /app/src ./src
COPY --from=builder /app/middleware.ts ./middleware.ts
# COPY --from=builder /app/proxy.ts ./proxy.ts

EXPOSE 3000

CMD ["pnpm", "start"]
