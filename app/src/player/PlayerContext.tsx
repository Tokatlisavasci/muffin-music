import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AudioPlayer, AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';
import { trackStreamUri, warmStream } from '../lib/api';
import type { Track } from '../types';

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerApi {
  queue: Track[];
  /** index into `queue` of the current track, or -1 */
  currentIndex: number;
  /** tracks in actual playback order (shuffle-aware) */
  queueDisplay: Track[];
  /** position of the current track inside queueDisplay */
  queuePos: number;
  current: Track | null;
  isPlaying: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  liked: Record<string, Track>;
  contextLabel: string | null;
  /** Start playing `list` from `startLinear` (index in the list). */
  playList: (list: Track[], startLinear: number, contextLabel: string | null) => void;
  /** Enable shuffle and start playing `list` from a random track. */
  playShuffled: (list: Track[], contextLabel: string | null) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  /** Jump to a position in the *current queue order*. */
  jumpTo: (pos: number) => void;
  seekTo: (seconds: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleLike: (track: Track) => void;
}

export interface PlayerProgress {
  position: number;
  duration: number;
  buffering: boolean;
  error: string | null;
}

const PlayerContext = createContext<PlayerApi | null>(null);
const ProgressContext = createContext<PlayerProgress>({
  position: 0,
  duration: 0,
  buffering: false,
  error: null,
});

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}

export function useProgress(): PlayerProgress {
  return useContext(ProgressContext);
}

function clampIndex(i: number, len: number): number {
  if (len <= 0) return -1;
  if (i < 0) return 0;
  if (i >= len) return len - 1;
  return i;
}

function shuffledIndices(len: number): number[] {
  const arr = Array.from({ length: len }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<AudioPlayer | null>(null);
  if (!playerRef.current) {
    // 250ms status updates keep the seek bar smooth enough without a native slider.
    playerRef.current = createAudioPlayer(null, { updateInterval: 250 });
  }
  const player = playerRef.current;

  const [queue, setQueue] = useState<Track[]>([]);
  const [order, setOrder] = useState<number[]>([]); // play order: indices into queue
  const [currentIndex, setCurrentIndex] = useState(-1); // index into queue
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [shuffle, setShuffle] = useState(false);
  const [liked, setLiked] = useState<Record<string, Track>>({});
  const [contextLabel, setContextLabel] = useState<string | null>(null);
  const [progress, setProgress] = useState<PlayerProgress>({
    position: 0,
    duration: 0,
    buffering: false,
    error: null,
  });

  // Latest-state mirror so event listeners / async flows never read stale state.
  const stateRef = useRef({ queue, order, currentIndex, repeat, shuffle });
  stateRef.current = { queue, order, currentIndex, repeat, shuffle };

  const seqRef = useRef(0);

  const current: Track | null =
    currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  // -------------------------------------------------------------------------
  // Loading / core stepping
  // -------------------------------------------------------------------------

  const loadAt = useCallback(
    (list: Track[], orderList: number[], queueIndex: number, autoplay: boolean) => {
      const track = list[queueIndex];
      if (!track) return;
      seqRef.current += 1;
      const seq = seqRef.current;

      setQueue(list);
      setOrder(orderList);
      setCurrentIndex(queueIndex);
      setProgress({
        position: 0,
        duration: track.duration ?? 0,
        buffering: true,
        error: null,
      });

      const p = playerRef.current;
      if (!p) return;
      p.loop = stateRef.current.repeat === 'one';
      try {
        p.replace({ uri: trackStreamUri(track.id) });
        if (autoplay) p.play();
      } catch (e) {
        if (seq === seqRef.current) {
          setProgress((prev) => ({ ...prev, error: String(e) }));
        }
      }

      // Warm the *next* track's stream while this one plays, so skipping or
      // auto-advance starts almost instantly instead of resolving on demand.
      try {
        const pos = orderList.indexOf(queueIndex);
        const nextIdx = orderList[pos + 1];
        if (nextIdx !== undefined && list[nextIdx]) warmStream(list[nextIdx].id);
      } catch {
        // warming is best-effort
      }
    },
    []
  );    const step = useCallback(
      (dir: 1 | -1, manual: boolean) => {
        const { queue: q, order: o, currentIndex: cur, repeat: rep } = stateRef.current;
        if (!q.length || o.length === 0) return;

        // Manual previous while >3s into the track restarts it (Spotify behaviour).
        if (dir === -1 && manual && (playerRef.current?.currentTime ?? 0) > 3) {
          playerRef.current?.seekTo(0);
          return;
        }

        const curPos = o.indexOf(cur);
        if (curPos === -1) return;

      let nextPos = curPos + dir;
      const reachedEnd = dir === 1 && curPos >= o.length - 1;
      const reachedStart = dir === -1 && curPos <= 0;

      if (reachedEnd && !manual && rep !== 'all') {
        // natural end of the queue -> stop (repeat-one is handled by player.loop)
        setIsPlaying(false);
        return;
      }
      if (reachedEnd) nextPos = 0;
      else if (reachedStart) nextPos = o.length - 1;

      loadAt(q, o, o[nextPos], true);
    },
    [loadAt]
  );

  const stepRef = useRef(step);
  stepRef.current = step;

  const toggleLike = useCallback((track: Track) => {
    setLiked((prev) => {
      const next = { ...prev };
      if (next[track.id]) delete next[track.id];
      else next[track.id] = track;
      return next;
    });
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const p = playerRef.current;
    if (!p) return;
    try {
      void p.seekTo(Math.max(0, seconds));
    } catch {
      // seeking before load: ignore
    }
    setProgress((prev) => ({ ...prev, position: Math.max(0, seconds) }));
  }, []);

  const playList = useCallback(
    (list: Track[], startLinear: number, label: string | null) => {
      if (!list.length) return;
      const start = clampIndex(startLinear, list.length);
      const shuffled = stateRef.current.shuffle ? shuffledIndices(list.length) : null;

      if (shuffled) {
        // keep the requested track playing at the same slot
        const startIdx = shuffled.indexOf(start);
        shuffled.splice(startIdx, 1);
        const insertAt = 0;
        shuffled.splice(insertAt, 0, start);
      }

      const orderList = shuffled ?? list.map((_, i) => i);
      setContextLabel(label);
      loadAt(list, orderList, start, true);
    },
    [loadAt]
  );

  const playShuffled = useCallback(
    (list: Track[], label: string | null) => {
      if (!list.length) return;
      const orderList = shuffledIndices(list.length);
      setShuffle(true);
      setContextLabel(label);
      loadAt(list, orderList, orderList[0], true);
    },
    [loadAt]
  );

  const jumpTo = useCallback(
    (pos: number) => {
      const { queue: q, order: o } = stateRef.current;
      if (!q.length || pos < 0 || pos >= o.length) return;
      loadAt(q, o, o[pos], true);
    },
    [loadAt]
  );

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    const { queue: q, order: o, currentIndex: cur } = stateRef.current;
    if (!p) return;
    if (cur < 0 && q.length) {
      loadAt(q, o, o[0], true);
      return;
    }
    if (p.paused) {
      p.play();
      setIsPlaying(true);
    } else {
      p.pause();
      setIsPlaying(false);
    }
  }, [loadAt]);

  const toggleShuffle = useCallback(() => {
    setShuffle((prevShuffle) => {
      const { queue: q, order: o, currentIndex: cur } = stateRef.current;
      if (!q.length) return !prevShuffle;

      if (!prevShuffle) {
        // enable: keep the current song at the same position, randomize the rest
        const rest = q.map((_, i) => i).filter((i) => i !== cur);
        const mixed = shuffledIndices(rest.length).map((k) => rest[k]);
        const curPos = o.indexOf(cur);
        const safePos = Math.max(0, Math.min(curPos === -1 ? 0 : curPos, mixed.length));
        const nextOrder = [...mixed.slice(0, safePos), cur, ...mixed.slice(safePos)];
        setOrder(nextOrder);
        setCurrentIndex(cur); // unchanged
      } else {
        // disable: back to plain order, keep position
        const linear = q.map((_, i) => i);
        setOrder(linear);
        if (cur >= 0) setCurrentIndex(cur);
      }
      return !prevShuffle;
    });
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) => {
      const next: RepeatMode = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
      const p = playerRef.current;
      if (p) p.loop = next === 'one';
      return next;
    });
  }, []);

  // Keep player.loop in sync with repeat mode.
  useEffect(() => {
    player.loop = repeat === 'one';
  }, [repeat, player]);

  // -------------------------------------------------------------------------
  // Audio-mode config + status listener (mount once)
  // -------------------------------------------------------------------------

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: true,
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {
      // audio mode is best-effort (web ignores most of it)
    });

    const sub = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.didJustFinish) {
        stepRef.current(1, false);
        return;
      }
      setIsPlaying(status.playing);
      setProgress({
        position: status.currentTime || 0,
        duration: status.duration || 0,
        buffering: status.isBuffering,
        error: null,
      });
    });

    return () => {
      sub.remove();
      player.remove();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock-screen "now playing" metadata on native.
  useEffect(() => {
    if (!current || Platform.OS === 'web') return;
    try {
      player.setActiveForLockScreen(true, {
        title: current.title,
        artist: current.artist,
        artwork: { uri: current.thumb },
      } as never);
    } catch {
      // some platforms/versions don't support lock-screen metadata
    }
  }, [current, player]);

  const queueDisplay = useMemo<Track[]>(
    () => order.map((i) => queue[i]).filter((t): t is Track => !!t),
    [order, queue]
  );
  const queuePos = currentIndex >= 0 ? order.indexOf(currentIndex) : -1;

  const api = useMemo<PlayerApi>(
    () => ({
      queue,
      currentIndex,
      queueDisplay,
      queuePos,
      current,
      isPlaying,
      repeat,
      shuffle,
      liked,
      contextLabel,
      playList,
      playShuffled,
      togglePlay,
      next: () => step(1, true),
      prev: () => step(-1, true),
      jumpTo,
      seekTo,
      toggleShuffle,
      cycleRepeat,
      toggleLike,
    }),
    [
      queue,
      currentIndex,
      queueDisplay,
      queuePos,
      current,
      isPlaying,
      repeat,
      shuffle,
      liked,
      contextLabel,
      playList,
      playShuffled,
      togglePlay,
      step,
      jumpTo,
      seekTo,
      toggleShuffle,
      cycleRepeat,
      toggleLike,
    ]
  );

  return (
    <PlayerContext.Provider value={api}>
      <ProgressContext.Provider value={progress}>{children}</ProgressContext.Provider>
    </PlayerContext.Provider>
  );
}
