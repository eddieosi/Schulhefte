# Dockerfile for Schulheft Pro PWA & Server
FROM node:22-alpine

WORKDIR /app

# Copy dependency specifications
COPY package.json package-lock.json* bun.lock* ./

# Install dependencies with legacy peer deps flag to ensure smooth container builds
RUN npm install --legacy-peer-deps

# Copy application source code
COPY . .

# Build frontend production bundle
RUN npm run build

# Expose default port
EXPOSE 3000

# Mount persistent data directory for notebooks JSON and images
VOLUME ["/app/data"]

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start server
CMD ["npm", "start"]
