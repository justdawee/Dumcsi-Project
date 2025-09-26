## Build Vue 3 + Vite (Tailwind) and serve via Nginx

FROM node:20-alpine AS build
WORKDIR /app

# Build context is repo root; copy frontend package manifests
COPY src/Dumcsi.Frontend/package.json src/Dumcsi.Frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy full frontend sources
COPY src/Dumcsi.Frontend/ ./

# Build-time endpoints. Default API to relative path; leave LiveKit empty to derive at runtime.
ARG VITE_API_URL=/api
ARG VITE_LIVEKIT_URL=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_LIVEKIT_URL=$VITE_LIVEKIT_URL

RUN npm run build

FROM nginx:1.27-alpine AS final
WORKDIR /usr/share/nginx/html

# Copy Nginx config from docker folder (repo root context)
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ .

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
