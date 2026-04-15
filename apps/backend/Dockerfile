FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Build
FROM deps AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

# Production image
FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

RUN npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
