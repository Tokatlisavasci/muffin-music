# Muffin Music server — self-contained image.
#
# Host this anywhere that can run a container (Railway, Render, Fly.io, GCP,
# a VPS, ...) so the app works for other people without a server on their
# machine. Then bake the public URL into the app bundle:
#
#   EXPO_PUBLIC_SERVER_URL=https://your-host.example.com npx expo run:android
#
# (see README → "Deploy the server so other people can use the app").

FROM node:20-alpine

# Standalone yt-dlp binary (self-contained; no Python needed).
RUN apk add --no-cache curl \
  && curl -fsSL -A "muffin-music-docker" -o /usr/local/bin/yt-dlp \
     https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app

# Install dependencies first (cached layer).
COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY index.mjs ./

ENV PORT=8787
EXPOSE 8787
CMD ["node", "index.mjs"]