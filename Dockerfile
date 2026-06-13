# Multi-stage production Build
# Compile frontend assets and bundle backend server

FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Build Vite frontend assets and bundle express backend using esbuild
RUN npm run build

# Production execution container image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled resources from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
