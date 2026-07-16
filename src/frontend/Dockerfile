FROM node:22-alpine AS deps

WORKDIR /app
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set maxsockets 3

COPY package.json package-lock.json ./
RUN for i in 1 2 3 4 5; do npm ci && break || { echo "npm ci failed, retrying in 5s (attempt $i)..." && sleep 5; }; done

FROM node:22-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

# Placeholders for Next.js build-time evaluation of auth routes (overridden at runtime).
ENV AUTH_SECRET=build-placeholder \
    AUTH_GOOGLE_ID=build-placeholder \
    AUTH_GOOGLE_SECRET=build-placeholder \
    DATABASE_URL=postgresql://build:build@localhost:5432/build

RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.deploy.mjs ./prisma.config.deploy.mjs
# dotenv is only used by prisma.config.deploy.mjs (not traced by Next.js standalone),
# so copy it explicitly to make it available at container startup.
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv
COPY docker-entrypoint.prod.sh /docker-entrypoint.prod.sh

RUN npm install -g prisma@7.8.0 \
    && chmod +x /docker-entrypoint.prod.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.prod.sh"]
CMD ["node", "server.js"]
