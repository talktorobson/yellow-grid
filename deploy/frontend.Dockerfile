# Build Stage
FROM node:20-alpine as build
WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web/ .
# Environment variables for the build
ENV VITE_API_BASE_URL=/api/v1
RUN npm run build

# Run Stage
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
