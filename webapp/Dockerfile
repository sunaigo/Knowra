# ---- Dependencies Stage ----
# Install dependencies in a separate stage to leverage build cache.
FROM node:20-slim AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency definition files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile --prod

# ---- Builder Stage ----
# Build the application.
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install pnpm
RUN npm install -g pnpm

# Build the Next.js application for production.
RUN pnpm build

# ---- Runner Stage ----
# This is the final image that will be deployed.
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user for security purposes.
RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from the builder stage.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to the non-root user.
USER nextjs

EXPOSE 3000

ENV PORT 3000

# The command to start the Next.js production server.
CMD ["node", "server.js"] 