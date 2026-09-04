/** 213 -> "3:33" */
export function fmtTime(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Strip noise that YouTube search hits carry, e.g.
 * "Adele - Hello (Official Music Video)" -> "Hello" when artist="Adele".
 */
export function cleanTitle(raw: string, artist?: string): string {
  let t = raw.trim();
  // "Artist - Song ..." prefix when the channel/artist is known
  if (artist && artist.length > 1) {
    for (const dash of [' - ', ' – ', ' — ']) {
      const prefix = artist + dash;
      if (t.toLowerCase().startsWith(prefix.toLowerCase())) {
        t = t.slice(prefix.length);
        break;
      }
    }
  }
  // bracketed noise suffixes: (Official Music Video), [HD], (Lyrics), ...
  t = t.replace(
    /\s*[([][^)\]]*(official\s*(music\s*)?video|music\s*video|official\s*video|official\s*lyric\s*video|lyrics?|audio|visualizer|official\s*audio|hd|4k|4k\s*uhd|video\s*official)[^)\]]*[)\]]/gi,
    ''
  );
  t = t.replace(/\s+-\s+Topic\s*$/i, '');
  t = t.replace(/\s+\(\s*\)\s*$/g, '');
  t = t.trim();
  return t || raw.trim();
}

/** Pick a stable, pleasant background color for a string id. */
export function hashColor(seed: string, palette: readonly string[]): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(h) % palette.length];
}
