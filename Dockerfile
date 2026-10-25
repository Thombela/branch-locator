# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24

# ---- deps: install exactly what the lockfile says --------------------------------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Lifecycle scripts are skipped: nothing here needs them (the MSW worker is committed).
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts --no-audit --no-fund

# ---- test: `docker build --target test .` runs the full quality gate ------------
FROM deps AS test
COPY . .
RUN npm run verify

# ---- build: static production bundle ---------------------------------------------
FROM deps AS build
COPY . .
ARG VITE_API_BASE_URL=""
ARG VITE_ENABLE_MOCKS="true"
ARG VITE_MAP_STYLE_LIGHT=""
ARG VITE_MAP_STYLE_DARK=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_ENABLE_MOCKS=$VITE_ENABLE_MOCKS \
    VITE_MAP_STYLE_LIGHT=$VITE_MAP_STYLE_LIGHT \
    VITE_MAP_STYLE_DARK=$VITE_MAP_STYLE_DARK
RUN npm run build

# ---- runtime: unprivileged nginx serving static files -----------------------------
FROM nginxinc/nginx-unprivileged:1.30-alpine AS runtime
LABEL org.opencontainers.image.title="branch-locator" \
      org.opencontainers.image.description="Branch Locator map (React + TypeScript + MapLibre)"
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
