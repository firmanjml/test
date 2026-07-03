# syntax=docker/dockerfile:1

# Official Bun image.
# Pin to an exact version (e.g. oven/bun:1.3.14) for fully reproducible builds.
FROM oven/bun:1

WORKDIR /app

# ---- Dependencies ----
# Copy only the dependency manifests so this layer is cached and reused
# across builds that only change source code.
COPY package.json bun.lock ./

# --production        skip devDependencies (@types/bun isn't needed at runtime)
# --frozen-lockfile   fail the build if bun.lock is out of sync with package.json
RUN bun install --frozen-lockfile --production

# ---- Application ----
# Bun runs TypeScript natively, so there is no separate build/compile step.
COPY tsconfig.json ./
COPY src ./src

# Drop privileges: the oven/bun image ships a non-root "bun" user (uid 1000).
USER bun

# Bun auto-serves a default-exported Hono app on port 3000.
ENV PORT=3000
EXPOSE 3000

# Liveness check: any HTTP response (even the 404 from an empty store) means
# the server is up; only a failed connection is treated as unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/').then(()=>process.exit(0)).catch(()=>process.exit(1))"

# Run the app.
CMD ["bun", "run", "src/index.ts"]
