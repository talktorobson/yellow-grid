# Build Stage
FROM node:20-alpine as build
WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web/ .
# Copy production environment configuration
COPY web/.env.production .env.production
RUN npm run build

# Build Mobile
COPY mobile/package*.json ./mobile/
# Install mobile dependencies (legacy-peer-deps for React Native/Expo compatibility)
RUN cd mobile && npm install --legacy-peer-deps
COPY mobile/ ./mobile/
# Build mobile web
RUN cd mobile && npx expo export -p web

# Run Stage
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY --from=build /app/mobile/dist /srv/mobile
COPY deploy/Caddyfile /etc/caddy/Caddyfile
