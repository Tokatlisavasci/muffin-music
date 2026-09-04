# Muffin Music server — self-contained image.
#
# Host this anywhere that can run a container (Railway, Render, Fly.io, GCP,
# a VPS, ...) so the app works for other people without a server on their
# machine. Then bake the public URL into the app bundle:
#
#   EXPO_PUBLIC_SERVER_URL=https://your-host.example.com npx expo run:android
#
# (see README → "Deploy the server so other people can use the app").

FROM node:20-slim

# yt-dlp is a Python program (the release "binary" is a zipapp that needs
# `python3`). Installing it via pip is the most reliable cross-version path.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip \
  && pip3 install --no-cache-dir --break-system-packages yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (cached layer).
COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY index.mjs ./

ENV PORT=8787
EXPOSE 8787
CMD ["node", "index.mjs"]