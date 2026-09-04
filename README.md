# Muffin Music — a Spotify-style music app (Expo + YouTube)

A mobile app that looks and behaves like the Spotify client, but plays music
sourced from **YouTube search results** through a tiny local proxy server.

> **What it is not:** it does not use Spotify's brand, logo, artwork or API, and
> the playlists are original seeds. Music is streamed from whatever the YouTube
> search returns for a song query — use it for personal listening only.

```
┌──────────────────────────┐         ┌───────────────────────────┐
│  app/  (Expo / React Native)   │  HTTP  │  server/  (Node proxy)      │
│  Home · Search · Library   │ ─────▶ │  /api/search  → yt-dlp      │
│  mini player · full player │ ◀───── │  /api/stream → audio proxy   │
└──────────────────────────┘         └───────────────────────────┘
                                          │ yt-dlp (searches YouTube,
                                          │ resolves & streams audio)
                                          ▼
                                      YouTube
```

## Project layout

| Path | What it is |
| --- | --- |
| `app/` | Expo (**SDK 54**, TypeScript) app — runs in Expo Go (ads need a dev build). `App.tsx` + `src/` |
| `app/src/screens/` | Home, Search, Library, Playlist detail, full-screen Player |
| `app/src/components/PlayerArt.native.tsx` | Native AdMob ad shown in place of the player artwork (dev builds only) |
| `app/src/player/PlayerContext.tsx` | Audio engine: expo-audio, queue, shuffle/repeat, likes |
| `app/src/lib/seeds.ts` | Curated playlists (song names) + Browse-all categories |
| `server/` | Express proxy: YouTube search + audio streaming via `yt-dlp` |
| `server/bin/` | Standalone `yt-dlp` binary (downloaded by `npm run setup`) |

## Quick start

**1. Start the music server** (one terminal):

```bash
cd server
npm install
npm run setup     # downloads the latest yt-dlp binary into server/bin
npm start         # listens on http://0.0.0.0:8787
```

**2. Start the app** (another terminal):

```bash
cd app
npm install
npx expo start
```

Then:

- **Phone (recommended)** — install **Expo Go** and scan the QR code. The phone
  must be on the **same Wi-Fi** as this computer; the app auto-detects the
  dev-machine's LAN address and finds the server on port `8787`. No config needed.
- **Android emulator / iOS simulator** — `npx expo start` then press `a` / `i`.
- **Browser** — press `w` (streaming works too, audio plays through the proxy).

### What you can do

- Home: greeting, quick-pick grid, *Made For You* / *Your Top Mixes* rows.
- Open a playlist → it resolves each song on YouTube (first load takes a few
  seconds; afterwards everything is cached on the server for 45 min in memory
  + 7 days on disk). Tapping a song in the list jumps straight into the
  full-screen player with that song playing.
- Search anything; results stream instantly; tap a song or play a whole list.
- Full player: blurred cover backdrop, seek bar (drag to scrub), shuffle,
  repeat (off / all / one), skip, Up-Next queue sheet, and ♥ like.
- Your Library: liked songs + saved playlists.

## Deploy the server so other people can use the app

The app always talks to the Muffin Music server — it has no local database and
cannot reach YouTube on its own. For **you**, that server runs on your machine;
for **other people** it has to be hosted somewhere public, and the app has to
know its address. Two steps, done once:

**1. Host the server** (any platform that runs Docker — Railway, Render,
Fly.io, GCP Cloud Run, a VPS …):

```bash
docker build -t muffin-server server/
docker run -d -p 8787:8787 --restart unless-stopped muffin-server
```

The image downloads the latest yt-dlp at build time; the server caches
searches/streams in memory and on disk (ephemeral disk on most hosts is fine —
the cache just rebuilds). Verify with `https://your-host/api/health`.

### Hosting on Render (recommended)

The repo ships a `render.yaml` Blueprint that does all of this for you:

1. **Put this folder in a GitHub repo** (it isn't one yet):

   ```bash
   git init
   git add .
   git commit -m "Muffin Music app + server"
   # create an empty repo at github.com (e.g. "muffin-music"), then:
   git remote add origin https://github.com/<you>/muffin-music.git
   git push -u origin main
   ```

2. On **render.com**: *New → Blueprint → connect the GitHub repo*. `render.yaml`
   builds `server/Dockerfile`, starts the service and health-checks
   `/api/health`. First deploy takes a few minutes; you get a URL like
   `https://muffin-music-server.onrender.com`.

3. Verify: open `https://muffin-music-server.onrender.com/api/health` → should
   return `{"ok":true,...}`.

4. Bake the URL into the app and build the APK:

   ```bash
   cd app
   EXPO_PUBLIC_SERVER_URL=https://muffin-music-server.onrender.com npx expo run:android
   ```

> **Free tier note:** Render's free web services **spin down after 15 min of
> inactivity** — the first search after a pause takes ~1 minute while the
> instance wakes up (the app just shows the spinner, then recovers). For truly
> always-on service, upgrade to a paid plan (Starter ≈ $7/mo) or set `plan:
> paid` in `render.yaml`. Also, YouTube occasionally bot-checks datacenter IPs
> — if searches start failing, trigger a redeploy (pulls the latest yt-dlp)
> or try again later.

**2. Bake the URL into the app** — the built bundle goes straight to your
server, with no probing, no local server and no firewall issues:

```bash
cd app
EXPO_PUBLIC_SERVER_URL=https://your-host.example.com npx expo run:android
```

`EXPO_PUBLIC_SERVER_URL` is inlined at bundle time (see `lib/api.ts`), so any
build works — `expo run:android` for an APK, `expo export` for web, or an EAS
cloud build. Leave it unset for local development: the app then auto-discovers
your machine (emulator / same Wi-Fi / `adb reverse`) exactly as before.

> **Caveats for public hosting** — YouTube occasionally bot-checks datacenter
> IPs ("Sign in to confirm you're not a bot"); if a hosted server starts
> failing searches, rebuild with a fresh yt-dlp (`docker build --no-cache`) or
> switch hosts. And as noted at the top of this file: this streams YouTube
> audio — keep it to personal use.

## Ads (Admob banner)

Two AdMob banner slots, both inline-adaptive and centered:

- **Full-screen player** — replaces the big artwork with a banner ad when one
  fills, otherwise the artwork is shown.
- **Home screen** — a small banner under the quick-pick grid (fills the ragged
  area of the last grid row); it appears only once an ad loads and collapses
  entirely on no-fill.

- Ad unit (banner): `ca-app-pub-7415475553930604/6728186063`
- App id: `ca-app-pub-7415475553930604~9386671828` — registered in
  `app/app.json` via the `react-native-google-mobile-ads` config plugin.
- `react-native-google-mobile-ads` is installed (pinned to **16.3.4** — do not
  bump it: 16.4+ pulls Google Mobile Ads SDK 25.4, which ships Kotlin 2.3
  metadata that this project's Kotlin 2.1 toolchain cannot compile against;
  16.3.4 pins GMA 25.0.0 and builds cleanly). `expo-asset` (~12.0.13) and
  `expo-font` (~14.0.12) are also pinned as direct dependencies: their `*`
  peer-ranges make npm hoist SDK 57 builds (expo-asset 57 / expo-font 57) to
  the top level, which crash the app on launch against the SDK 54
  `expo-modules-core` (verified: `NoClassDefFoundError: AnyTypeCache` /
  `NoSuchMethodError` in `ReturnTypeKt` on Android). The ad slot lives in
  `PlayerArt.native.tsx` (`BannerAd` from the ads package, mounted only after
  the native module loads and faded in on `onAdLoaded`). While the full-screen
  player is open the banner **auto-refreshes every 60 s** (`BANNER_REFRESH_MS`)
  — the currently visible ad stays up until its replacement has loaded, so a
  failed refresh is never visible. `HomeBanner.native.tsx` hosts the home
  slot (capped at 120 dp tall via `maxHeight`). The ad unit ids live in
  `components/adConfig.ts` (shared by both slots). Note: with the previous
  **native** ad
  format the unit returned no-fill on every request even though the module
  worked — the **banner** format is what actually serves here.

**Important:** AdMob is a native module, so ads only work in a **development
or production build** — not in Expo Go, and not on web. In those environments
the component silently shows the regular artwork instead (`PlayerArt.tsx` is
the web/Expo-Go fallback; `PlayerArt.native.tsx` holds the ad logic and loads
the module lazily so Expo Go never crashes).

To see real ads: register the app in AdMob with that app id, then build
`cd app && npx expo run:android` (or an EAS build). Until your app is linked
to the ad unit you'll likely get "no fill" — the UI then keeps showing the
artwork. For a local sanity check with Google's always-filling sample banner
unit, start Metro with `EXPO_PUBLIC_ADMOB_TEST=1` (or set
`EXPO_PUBLIC_ADMOB_UNIT_ID=ca-app-pub-3940256099942544/6300978111`).

## How the streaming works

React Native cannot easily talk to YouTube's internal APIs, and the YouTube
video players aren't playable as plain audio on mobile. So the server:

1. **Search** — runs `yt-dlp "ytsearchN:<query>" -J` (flat, fast) and returns
   `{ id, title, artist, duration, thumb }` per hit. Up to 6 lookups run in
   parallel; results are cached in memory (45 min) **and on disk (7 days)**, so
   reopening a playlist is instant even after restarts.
2. **Stream** — on demand, resolves the best audio-only URL for a video
   (`bestaudio`) and **proxies it with HTTP Range forwarding**, so the app's
   audio player can seek. URLs are cached for 2 hours.
3. **Warm-up** — playlists resolve **progressively** (rows appear as each song
   is found), and while a track plays the app pre-resolves the *next* track's
   stream URL (`GET /api/warm/:id`), so skipping is instant.

The app never touches YouTube directly — everything funnels through
`GET {server}/api/search`, `GET {server}/api/warm/:id` and
`GET {server}/api/stream/:videoId`.

## Configuration & troubleshooting

| Symptom | Fix |
| --- | --- |
| "Could not reach the Muffin Music server" | The message now shows exactly which URL the app tried. For local dev the app auto-detects the host by probing, in order: the Expo dev-server host (LAN — phones on the same Wi-Fi just work), `10.0.2.2` (Android emulator), then loopback. Fixes: make sure `npm start` is running in `server/`; same Wi-Fi for real phones; **Windows Firewall** may block inbound `8787` (allow Node.js); for a **USB/emulator** connection run `adb reverse tcp:8081 tcp:8081` and `adb reverse tcp:8787 tcp:8787` (the emulator also works via its built-in `10.0.2.2` alias, no reverse needed). Quick check from the phone browser: `http://<computer-ip>:8787/api/health`. In a release build the app should have a public URL baked in via `EXPO_PUBLIC_SERVER_URL` (see the deployment section) — if it shows a `localhost`-ish URL instead, rebuild with the env var set. |
| Searches/playback suddenly fail after working | YouTube changes its internals; update the binary: `cd server && npm run setup` (fetches the newest yt-dlp) and restart. |
| Port conflicts | `PORT=9000 npm start` in `server/`, then in `app/src/lib/api.ts` set `SERVER_PORT = 9000`. |
| Custom yt-dlp | `YT_DLP_BIN=/path/to/yt-dlp npm start`. |
| `PORT=0` in your shell | The server ignores a falsy `PORT` and falls back to `8787`. |

Other notes:

- Pinned to **Expo SDK 54** so it runs directly in Expo Go (check your Expo Go
  version: `npx expo start` will warn with "Project is incompatible" if the
  installed Expo Go expects a different SDK). For store builds you'd run
  `npx expo run:android` / `ios` — `expo-audio`'s config plugin for background
  audio is already in `app/app.json`.
- Background/lock-screen metadata is set on native; background audio on Android
  needs the config plugin + lock-screen activation (already wired in
  `PlayerContext`).
- Likes and the queue are in-memory (reset on app restart). Adding persistence
  (`@react-native-async-storage/async-storage`) is a natural next step.

## Ideas to take it further

- Real thumbnails/album art per playlist (persist resolved YouTube hits).
- Persistent liked songs + playlists (AsyncStorage).
- Queue editing (remove/reorder from the Up-Next sheet), search-in-library.
- Dev-client build to unlock background audio on iOS and lockscreen controls.
