# Build stage
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Runtime stage
FROM node:22-alpine

RUN apk add --no-cache tini curl

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public

RUN addgroup -S linkforge && adduser -S linkforge -G linkforge
RUN mkdir -p /app/data && chown linkforge:linkforge /app/data
USER linkforge

ENV PORT=8080
ENV HOST=0.0.0.0
ENV DB_PATH=/app/data/linkforge.db

EXPOSE 8080

VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["node", "src/index.js"]
