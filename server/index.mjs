// Muffin Music server — a tiny YouTube search + audio-stream proxy.
//
// The Expo app cannot reliably talk to YouTube's internal APIs itself, so this
// server shells out to the pinned `yt-dlp` binary in ./bin (or on PATH) to:
//   1. search YouTube and return song-like results (title / channel / duration)
//   2. resolve the best audio URL for a video and proxy the stream to the app,
//      forwarding HTTP Range requests so players can seek.
//
// Run:  node index.mjs          (defaults to port 8787, all interfaces)

import express from 'express';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)));
const isWin = process.platform === 'win32';
const LOCAL_BIN = join(ROOT, 'bin', isWin ? 'yt-dlp.exe' : 'yt-dlp');
const PORT = Number(process.env.PORT) || 8787; // some shells export PORT=0

// ---------------------------------------------------------------------------
// yt-dlp helpers
// ---------------------------------------------------------------------------

function binPath() {
  if (process.env.YT_DLP_BIN) return process.env.YT_DLP_BIN;
  if (existsSync(LOCAL_BIN)) return LOCAL_BIN;
  return 'yt-dlp'; // hope it is on PATH
}

const SEARCH_CONCURRENCY = 4;
let active = 0;
const queue = [];

function runYtDlp(args, { timeoutMs = 90_000 } = {}) {
  return new Promise((resolve, reject) => {
    const exec = () => {
      if (active >= SEARCH_CONCURRENCY) {
        queue.push(exec);
        return;
      }
      active += 1;
      const child = spawn(binPath(), args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`yt-dlp timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      child.stdout.on('data', (d) => (stdout += d));
      child.stderr.on('data', (d) => (stderr += d));
      child.on('error', (err) => {
        clearTimeout(timer);
        active -= 1;
        reject(err);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        active -= 1;
        const next = queue.shift();
        if (next) next();
        if (code === 0) resolve({ stdout, stderr });
        else reject(new Error(`yt-dlp exited ${code}: ${stderr.slice(0, 400)}`));
      });
    };
    exec();
  });
}

async function ytJson(args, timeoutMs) {
  const { stdout } = await runYtDlp(args, { timeoutMs });
  return JSON.parse(stdout);
}

// ---------------------------------------------------------------------------
// Caches
// ---------------------------------------------------------------------------

const searchCache = new Map(); // query -> { at, data }
const streamCache = new Map(); // id   -> { at, url, headers }

// Playlist lookups are stable (an "Artist - Song" search rarely changes), so
// cache generously and *persist to disk*: the app re-resolves every playlist
// after each restart, and a disk cache makes that instant.
const SEARCH_TTL = 45 * 60_000;
const STREAM_TTL = 2 * 60 * 60_000; // signed googlevideo URLs expire after ~6h
const DISK_TTL = 7 * 24 * 60 * 60_000;

const CACHE_FILE = join(ROOT, 'cache', 'search.json');
let saveTimer = null;

function scheduleSearchCacheSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const now = Date.now();
      const obj = {};
      for (const [k, v] of searchCache) {
        if (now - v.at < DISK_TTL) obj[k] = { at: v.at, data: v.data };
      }
      mkdirSync(dirname(CACHE_FILE), { recursive: true });
      writeFileSync(CACHE_FILE, JSON.stringify(obj));
    } catch {
      // disk cache is best-effort
    }
  }, 3000);
  saveTimer.unref?.();
}

function loadSearchCacheFromDisk() {
  try {
    const obj = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
    for (const [k, v] of Object.entries(obj)) {
      if (v && v.at && Array.isArray(v.data)) searchCache.set(k, { at: v.at, data: v.data });
    }
  } catch {
    // no cache file yet
  }
}

loadSearchCacheFromDisk();

function getCached(map, key, ttl) {
  const hit = map.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.data;
  map.delete(key);
  return null;
}

function sanitizeId(raw) {
  return String(raw || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

function cleanChannel(channel) {
  if (!channel) return 'Unknown artist';
  return channel.replace(/\s*-\s*Topic$/i, '').trim() || 'Unknown artist';
}

function mapEntry(e) {
  return {
    id: e.id,
    title: e.title,
    artist: cleanChannel(e.channel || e.uploader),
    duration: e.duration ?? null,
    thumb: `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`,
  };
}

// `full: true` extracts complete metadata (channel, duration, formats) per hit
// — slower but needed for channel/duration. `flat` uses the search page only.
async function doSearch(query, limit, full) {
  const l = Math.max(1, Math.min(Number(limit) || 10, 15));
  const args = [
    '--no-warnings',
    '--no-playlist',
    '--socket-timeout', '15',
    '--extractor-retries', '1',
    ...(full ? [] : ['--flat-playlist']),
    '-J',
    `ytsearch${l}:${query}`,
  ];
  const json = await ytJson(args, full ? 120_000 : 60_000);
  const entries = (json.entries || []).filter((e) => e && e.id && e.title);
  return entries.map(mapEntry);
}

// ---------------------------------------------------------------------------
// Stream resolution
// ---------------------------------------------------------------------------

const RESOLVE_ARGS = ['--no-warnings', '--no-playlist', '--socket-timeout', '15'];

// Try the cheap `-g` route first; fall back to parsing full JSON formats.
async function resolveAudioUrl(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const { stdout } = await runYtDlp([
      ...RESOLVE_ARGS,
      '-f', 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio',
      '-g',
      url,
    ], { timeoutMs: 90_000 });
    const direct = stdout.trim().split('\n').pop();
    if (direct && direct.startsWith('http')) {
      return { url: direct, headers: {} };
    }
  } catch {
    // fall through to -J parse
  }

  const json = await ytJson([...RESOLVE_ARGS, '-J', url], 90_000);
  const formats = (json.formats || [])
    .filter((f) => f.url && f.protocol === 'https' && !f.vcodec && f.acodec)
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
  const best = formats.find((f) => f.ext === 'm4a') || formats[0];
  if (!best) throw new Error('No playable audio format found');
  return {
    url: best.url,
    headers: best.http_headers || {},
  };
}

async function getStream(videoId) {
  const cached = getCached(streamCache, videoId, STREAM_TTL);
  if (cached) return cached;
  const resolved = await resolveAudioUrl(videoId);
  const data = { ...resolved, at: Date.now() };
  streamCache.set(videoId, data);
  return data;
}

// ---------------------------------------------------------------------------
// HTTP app
// ---------------------------------------------------------------------------

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, binary: binPath(), searchCache: searchCache.size, streamCache: streamCache.size });
});

app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'missing q' });
  try {
    const cacheKey = `${q.toLowerCase()}|${req.query.limit ?? ''}|${req.query.full ?? ''}`;
    let data = getCached(searchCache, cacheKey, SEARCH_TTL);
    if (!data) {
      data = await doSearch(q, req.query.limit, req.query.full === '1' || req.query.full === 'true');
      searchCache.set(cacheKey, { at: Date.now(), data });
      scheduleSearchCacheSave();
    }
    res.json({ results: data });
  } catch (err) {
    res.status(502).json({ error: `search failed: ${err.message}` });
  }
});

// Pre-resolve + cache a stream URL without sending media bytes. The app calls
// this for the next track while the current one plays, so skipping is instant.
app.get('/api/warm/:id', async (req, res) => {
  const id = sanitizeId(req.params.id);
  if (!id) return res.status(400).json({ error: 'missing id' });
  try {
    await getStream(id);
    res.status(204).end();
  } catch (err) {
    res.status(502).json({ error: `warm failed: ${err.message}` });
  }
});

// Proxies the audio stream. Pass ?direct=1 for a plain 302 redirect instead.
app.get('/api/stream/:id', async (req, res) => {
  const id = sanitizeId(req.params.id);
  if (!id) return res.status(400).json({ error: 'missing id' });
  const direct = req.query.direct === '1' || req.query.direct === 'true';
  try {
    const { url, headers } = await getStream(id);
    if (direct) return res.redirect(url);

    // Fetch upstream, forwarding the client's Range header. We only enforce a
    // timeout while *connecting*: aborting mid-stream crashes the pipe, and a
    // paused player may legitimately stall for a long time.
    const headersUp = { ...headers };
    if (req.headers.range) headersUp.range = req.headers.range;

    const controller = new AbortController();
    const connectTimer = setTimeout(() => controller.abort(), 20_000);
    let upstream;
    try {
      upstream = await fetch(url, {
        headers: headersUp,
        redirect: 'follow',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(connectTimer);
    }
    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).json({ error: `upstream ${upstream.status}` });
    }
    res.status(upstream.status);
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    if (upstream.body) {
      const nodeStream = requireNodeReadable(upstream.body);
      // Never let an upstream error crash the process.
      nodeStream.on('error', () => {
        try {
          res.destroy();
        } catch {
          /* already closed */
        }
      });
      // Client went away (pause/skip/navigation): stop pulling from YouTube.
      res.on('close', () => {
        try {
          nodeStream.destroy();
        } catch {
          /* already destroyed */
        }
      });
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(502).json({ error: `stream failed: ${err.message}` });
    } else {
      try {
        res.destroy();
      } catch {
        /* already closed */
      }
    }
  }
});

function requireNodeReadable(body) {
  return Readable.fromWeb(body);
}

app
  .listen(PORT, '0.0.0.0', () => {
    console.log(`🎵 Muffin Music server listening on http://0.0.0.0:${PORT} (yt-dlp: ${binPath()})`);
  })
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use — is another Muffin Music server already running?`);
    } else {
      console.error('Failed to start server:', err.message);
    }
    process.exit(1);
  });
