FROM --platform=${BUILDPLATFORM} node:26@sha256:a98e6fda54fdbb22d4238054cca9a2a113bcd1191c09193a535aae22f400aa8e AS build

WORKDIR /opt/node_app

COPY . .

# Node.js 25 and later do not include Corepack.
RUN npm install --global pnpm@12.9.0

# do not ignore optional dependencies:
# Error: Cannot find module @rollup/rollup-linux-x64-gnu
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    npm_config_target_arch=${TARGETARCH} pnpm install --frozen-lockfile --filter "excalidraw-app..."

ARG NODE_ENV=production

RUN npm_config_target_arch=${TARGETARCH} pnpm build:app:docker

FROM nginx:stable-alpine-slim@sha256:2c605dbeab79a6b2a63340474fe58119d0ef95bdc4b1f41df0aa689659b3d13b

COPY --from=build /opt/node_app/excalidraw-app/build /usr/share/nginx/html

HEALTHCHECK CMD wget -q -O /dev/null http://localhost || exit 1
