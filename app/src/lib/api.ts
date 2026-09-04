import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';
import type { Track } from '../types';
import type { SeedPlaylist } from './seeds';
import { cleanTitle } from './format';

// The proxy server always listens on this port next to the Expo dev server.
const SERVER_PORT = 8787;

// ---------------------------------------------------------------------------
// Server address.
//
// In development the server runs next to Metro on your machine, so we discover
// it by probing the candidate hosts below. In a build you hand to OTHER people
// there is no local server — you host server/ somewhere public and bake that
// URL into the bundle at build time:
//
//   EXPO_PUBLIC_SERVER_URL=https://music.example.com npx expo run:android
//   EXPO_PUBLIC_SERVER_URL=https://music.example.com npx expo export --platform web
//
// Babel inlines the value when the bundle is produced, so end users skip the
// probing entirely and go straight to your hosted server. (It also works for
// dev: e.g. EXPO_PUBLIC_SERVER_URL=http://192.168.1.23:8787 forces a host.)
// ---------------------------------------------------------------------------
const OVERRIDE_URL = (process.env.EXPO_PUBLIC_SERVER_URL ?? '').trim();

/** Time (ms) each reachability probe is allowed before moving to the next host. */
const PROBE_TIMEOUT_MS = 1500;

/** Extract the host from something like "192.168.1.23:8081" or "exp://192.168.1.23:8081". */
function hostFromUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  try {
    let host = uri.split(':')[0];
    host = host.replace(/^.*\/\//, ''); // strip any scheme like exp://
    host = host.replace(/^\[|\]$/g, ''); // strip ipv6 brackets
    return host || null;
  } catch {
    return null;
  }
}

function isLoopback(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

/**
 * Hosts the JS bundle is being served from. Covers every way the app can run:
 *  - Expo Go / dev builds usually expose Constants.expoConfig.hostUri;
 *  - standalone dev builds don't, but the Metro bundle URL does
 *    (NativeModules.SourceCode.scriptURL) — e.g. "http://192.168.1.23:8081/index.bundle".
 */
function devServerHosts(): string[] {
  const raw: (string | null | undefined)[] = [
    Constants.expoConfig?.hostUri,
    (Constants as any).expoGoConfig?.debuggerHost as string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    (NativeModules as any).SourceCode?.scriptURL as string | undefined,
  ];
  const hosts: string[] = [];
  for (const uri of raw) {
    if (!uri) continue;
    let host: string | null = null;
    try {
      host = new URL(uri.includes('://') ? uri : `http://${uri}`).hostname;
    } catch {
      host = hostFromUri(uri);
    }
    if (host && !hosts.includes(host)) hosts.push(host);
  }
  return hosts;
}

/**
 * Ordered list of hosts that may be running the Muffin Music server:
 *  1. the dev-server host when it is a real LAN address — this is what makes a
 *     phone on the same Wi-Fi "just work";
 *  2. 10.0.2.2 — the Android emulator's alias for the host machine;
 *  3. the dev-server host even if loopback (iOS simulator / web / when the
 *     device reaches Metro through `adb reverse`);
 *  4. localhost as a last resort.
 */
function candidateHosts(): string[] {
  const hosts: string[] = [];
  const add = (h: string | null | undefined) => {
    if (h && !hosts.includes(h)) hosts.push(h);
  };
  const dev = devServerHosts();
  for (const h of dev) if (!isLoopback(h)) add(h);
  if (Platform.OS === 'android') add('10.0.2.2');
  for (const h of dev) if (isLoopback(h)) add(h);
  add('localhost');
  return hosts;
}

let baseCache: string | null = null;
let basePromise: Promise<string> | null = null;

async function probe(host: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`http://${host}:${SERVER_PORT}/api/health`, { signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves (once) to a working server base URL by probing candidate hosts.
 * Falls back to the first candidate if none answers, so the caller still gets
 * a meaningful URL and the UI can show a helpful error.
 */
export function ensureServerBase(): Promise<string> {
  if (OVERRIDE_URL) {
    const url = OVERRIDE_URL.replace(/\/$/, '');
    baseCache = url;
    return Promise.resolve(url);
  }
  if (baseCache) return Promise.resolve(baseCache);
  if (!basePromise) {
    // Probe each candidate once per app session and remember the winner.
    basePromise = (async (): Promise<string> => {
      const hosts = candidateHosts();
      for (const host of hosts) {
        if (await probe(host)) {
          const url = `http://${host}:${SERVER_PORT}`;
          baseCache = url;
          return url;
        }
      }
      const fallbackUrl = `http://${hosts[0]}:${SERVER_PORT}`;
      baseCache = fallbackUrl;
      return fallbackUrl;
    })();
  }
  return basePromise;
}

/** Synchronous view of the base URL (best known host) — used for stream URLs. */
export function serverBaseSync(): string {
  if (OVERRIDE_URL) return OVERRIDE_URL.replace(/\/$/, '');
  if (baseCache) return baseCache;
  return `http://${candidateHosts()[0]}:${SERVER_PORT}`;
}

export async function searchSongs(query: string, limit = 12): Promise<Track[]> {
  const q = encodeURIComponent(query.trim());
  if (!q) return [];
  const base = await ensureServerBase();
  const url = `${base}/api/search?q=${q}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`search failed (${res.status})`);
  const json = (await res.json()) as { results?: Track[] };
  return (json.results ?? [])
    .filter((r) => r && r.id && r.title)
    .map((r) => ({ ...r, title: cleanTitle(r.title, r.artist) }));
}

/** The server proxies & range-forwards the actual audio for this track. */
export function trackStreamUri(trackId: string): string {
  return `${serverBaseSync()}/api/stream/${encodeURIComponent(trackId)}`;
}

/**
 * Ask the server to resolve + cache a stream URL without streaming any bytes.
 * Fire-and-forget: used to warm the next track while the current one plays so
 * track changes start instantly.
 */
export function warmStream(trackId: string): void {
  try {
    void ensureServerBase().then((base) =>
      fetch(`${base}/api/warm/${encodeURIComponent(trackId)}`)
    ).catch(() => {
      // warming is best-effort; a cold start just takes a moment longer
    });
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Playlist resolution — progressive.
//
// Seed playlists are song names; we resolve each to its best YouTube hit.
// Results stream in as they arrive (so screens can render rows while the rest
// load) and are memoized for the whole app session. The server caches each
// lookup on disk, so re-opening the app is instant.
// ---------------------------------------------------------------------------

const WORKERS = 4;

interface PlaylistJob {
  id: string;
  seeds: SeedPlaylist['tracks'];
  /** indexed by seed position; may contain holes while loading */
  tracks: Track[];
  done: boolean;
  listeners: Set<(tracks: Track[], done: boolean) => void>;
}

const jobs = new Map<string, PlaylistJob>();

function snapshot(job: PlaylistJob): Track[] {
  return job.tracks.filter((t): t is Track => !!t);
}

function notify(job: PlaylistJob) {
  const tracks = snapshot(job);
  for (const cb of job.listeners) cb(tracks, job.done);
}

/**
 * Subscribe to a playlist's resolution. The callback fires immediately with
 * whatever is already resolved and again each time a new track arrives.
 * Returns an unsubscribe function.
 */
export function subscribePlaylist(
  playlist: SeedPlaylist,
  cb: (tracks: Track[], done: boolean) => void
): () => void {
  let job = jobs.get(playlist.id);
  if (!job) {
    job = { id: playlist.id, seeds: playlist.tracks, tracks: [], done: false, listeners: new Set() };
    jobs.set(playlist.id, job);
    void runLoad(job);
  }
  job.listeners.add(cb);
  cb(snapshot(job), job.done);
  return () => {
    job!.listeners.delete(cb);
  };
}

/** Promise form — resolves when every song has been looked up. */
export function resolvePlaylistTracks(playlist: SeedPlaylist): Promise<Track[]> {
  return new Promise((resolvePromise) => {
    const unsub = subscribePlaylist(playlist, (tracks, done) => {
      if (done) {
        unsub();
        resolvePromise(tracks);
      }
    });
  });
}

async function runLoad(job: PlaylistJob): Promise<void> {
  let cursor = 0;

  async function worker() {
    for (;;) {
      const i = cursor;
      cursor += 1;
      if (i >= job.seeds.length) return;
      const { title, artist } = job.seeds[i];
      try {
        const hits = await searchSongs(`${title} ${artist}`, 1);
        if (hits[0]) {
          job.tracks[i] = hits[0];
          notify(job);
        }
      } catch {
        // network hiccup: skip that song, keep the rest
      }
    }
  }

  await Promise.all(Array.from({ length: WORKERS }, () => worker()));
  job.done = true;
  notify(job);
}
