# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy codebase
COPY . .

# Generate Prisma Client & Build Nuxt production bundle
RUN npx prisma generate
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy output bundle and Prisma configuration
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/entrypoint.sh ./

# Expose Nuxt port
EXPOSE 3000

# Ensure entrypoint is executable
RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
