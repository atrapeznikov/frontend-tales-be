# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client and build application
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Copy only production dependencies to keep image small
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Install tsx for running seed scripts TODO УБРАТЬ ПОСЛЕ ИМПОРТА ДАННЫХ
RUN npm install -g tsx

# Regenerate Prisma client for this runtime
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Start script that runs migrations before starting the app
COPY start.sh ./
RUN chmod +x start.sh

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["./start.sh"]
