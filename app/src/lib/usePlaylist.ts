import { useEffect, useState } from 'react';
import type { Track } from '../types';
import type { SeedPlaylist } from './seeds';
import { subscribePlaylist } from './api';

export type Resolution =
  | { status: 'loading'; tracks: Track[] }
  | { status: 'ready'; tracks: Track[] }
  | { status: 'error'; tracks: Track[] };

/**
 * Resolves a seed playlist into playable tracks. `tracks` fills up
 * progressively (rows render as soon as each song is found); `status` flips to
 * 'ready'/'error' only when the whole lookup finished.
 */
export function useResolvedPlaylist(playlist: SeedPlaylist | null): Resolution {
  const [state, setState] = useState<Resolution>({ status: 'loading', tracks: [] });

  useEffect(() => {
    if (!playlist) {
      setState({ status: 'ready', tracks: [] });
      return;
    }
    setState({ status: 'loading', tracks: [] });
    return subscribePlaylist(playlist, (tracks, done) => {
      setState({
        status: !done ? 'loading' : tracks.length ? 'ready' : 'error',
        tracks,
      });
    });
  }, [playlist]);

  return state;
}
