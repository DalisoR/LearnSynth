# Frontend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Development command
CMD ["pnpm", "dev", "--host"]
