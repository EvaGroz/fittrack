# Multistage
# Stage 1. Build the React app 
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build        
# Ја прави папката /app/dist


# Stage 2. Serve the built files with nginx 
FROM nginx:stable-alpine

# nginx config template (BACKEND_URL is filled in at container start)
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Copy ONLY the built files from 1 (dist/)
COPY --from=build /app/dist /usr/share/nginx/html

# Default backend address (the service name backend for use in Docker Compose)
ENV BACKEND_URL=http://backend:5000

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ > /dev/null || exit 1