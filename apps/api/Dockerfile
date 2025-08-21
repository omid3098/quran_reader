FROM node:20-alpine AS base
WORKDIR /app

# Prisma engines need OpenSSL on Alpine
RUN apk add --no-cache openssl

# Install dependencies (include dev deps to allow prisma generate), then prune
COPY package.json ./
RUN npm install

# Copy rest of the app
COPY . .

# Generate Prisma client (if schema exists)
RUN npx prisma generate || true

# Prune devDependencies for smaller runtime image
RUN npm prune --production

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["node", "src/main.js"]

