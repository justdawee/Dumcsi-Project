## Build Vue 3 + Vite (Tailwind) and serve via Nginx

FROM node:20-alpine AS build
WORKDIR /app

# Context expected at src/Dumcsi.Frontend
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Build-time API endpoints
ARG VITE_API_URL=http://localhost:5000/api
ARG VITE_LIVEKIT_URL=ws://localhost:7880
ENV VITE_API_URL=$VITE_API_URL \
    VITE_LIVEKIT_URL=$VITE_LIVEKIT_URL

RUN npm run build

FROM nginx:1.27-alpine AS final
WORKDIR /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ .

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

