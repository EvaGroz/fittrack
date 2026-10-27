# Base image: Linux (Alpine) with Node.js 24 
FROM node:24-alpine

#  Working directory inside the container
WORKDIR /app

# Production mode
ENV NODE_ENV=production

# Copy only the dependency lists first (for caching)
COPY package.json package-lock.json ./

# Install only production dependencies 
RUN npm ci --omit=dev

# Copy the rest of the source code
COPY . .

# The port the app listens on
EXPOSE 5000

# Docker checks every 30s whether the app is healthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Kontejnerot raboti kako obicen korisnik, a ne kako administratot (root)
USER node

# Command that starts the app
CMD ["node", "src/server.js"]