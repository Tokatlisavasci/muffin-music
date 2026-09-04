import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { LIKED_ID, LIKED_META, playlistById } from '../lib/seeds';
import { useResolvedPlaylist } from '../lib/usePlaylist';
import { serverBaseSync } from '../lib/api';
import { usePlayer } from '../player/PlayerContext';
import { TrackRow } from '../components/TrackRow';
import type { RootStackParamList } from '../navigation/types';
import type { Track } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Playlist'>;

export function PlaylistScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { source } = route.params;
  const isLiked = source === LIKED_ID;
  const seed = isLiked ? null : playlistById(source);
  const {
    liked,
    playList,
    playShuffled,
    togglePlay,
    toggleShuffle,
    current,
    isPlaying,
    shuffle,
    contextLabel,
  } = usePlayer();

  const resolution = useResolvedPlaylist(seed);
  const likedTracks: Track[] = React.useMemo(() => Object.values(liked), [liked]);

  const tracks = isLiked ? likedTracks : resolution.tracks;
  const loading = !isLiked && resolution.status === 'loading';
  const loadingEmpty = loading && tracks.length === 0;
  const failed = !isLiked && resolution.status === 'error';

  const meta = isLiked ? LIKED_META : seed;
  const gradient: readonly [string, string] = meta
    ? meta.gradient
    : (['#1e3264', '#121212'] as const);
  const name = meta?.name ?? 'Playlist';
  const description = isLiked ? 'Songs you have liked' : meta?.description ?? '';

  const count = isLiked ? likedTracks.length : tracks.length || seed?.tracks.length || 0;

  // Is the current track part of THIS playlist? (context labels are unique per
  // playlist/search, so an equality check identifies the playing context.)
  const isThisContext = !!current && contextLabel === name;
  const canPlay = tracks.length > 0 && !failed;

  const onMainPress = () => {
    if (!canPlay) return;
    if (isThisContext) togglePlay();
    else playList(tracks, 0, name);
  };
  const onShufflePress = () => {
    if (!canPlay) return;
    if (isThisContext) toggleShuffle();
    else playShuffled(tracks, name);
  };

  // Opening a song from the list starts playback AND jumps straight into the
  // full-screen player (no extra mini-player tap).
  const onTrackPress = (index: number) => {
    if (!canPlay) return;
    playList(tracks, index, name);
    navigation.navigate('Player');
  };

  const mainIcon = isThisContext && isPlaying ? 'pause' : 'play';

  return (
    <View style={styles.root}>
      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <LinearGradient
              colors={[gradient[0], gradient[1], colors.bg]}
              start={{ x: 0.05, y: 0 }}
              end={{ x: 0.95, y: 1 }}
              style={[styles.banner, { paddingTop: insets.top + 20 }]}
            >
              <TouchableOpacity style={styles.backBtn} hitSlop={8} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={26} color={colors.white} />
              </TouchableOpacity>

              <Text style={styles.kind}>Playlist</Text>
              <Text style={styles.name}>{name}</Text>
              {description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {description}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                {isLiked ? 'Your liked songs' : 'Muffin Music'}
                {' • '}
                {count} song{count === 1 ? '' : 's'}
              </Text>
            </LinearGradient>

            <View style={styles.playRow}>
              <TouchableOpacity
                style={[
                  styles.shuffleBtn,
                  isThisContext && shuffle && styles.shuffleBtnActive,
                  !canPlay && styles.btnDisabled,
                ]}
                onPress={onShufflePress}
                disabled={!canPlay}
              >
                <Ionicons
                  name="shuffle"
                  size={20}
                  color={isThisContext && shuffle ? colors.black : colors.accent}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.playBtn, !canPlay && styles.btnDisabled]}
                onPress={onMainPress}
                disabled={!canPlay}
              >
                <Ionicons name={mainIcon} size={26} color={colors.black} style={{ marginLeft: mainIcon === 'play' ? 2 : 0 }} />
              </TouchableOpacity>
            </View>

            {loadingEmpty ? (
              <View style={styles.stateWrap}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : failed ? (
              <View style={styles.stateWrap}>
                <Text style={styles.stateText}>
                  Could not reach the Muffin Music server ({serverBaseSync()}). Start it with `npm start` inside server/ and pull to retry.
                </Text>
              </View>
            ) : null}

            {!loadingEmpty && !failed && tracks.length === 0 ? (
              <View style={styles.stateWrap}>
                <Text style={styles.stateText}>
                  {isLiked ? 'Tap the ♥ next to any song to add it here.' : 'No songs found.'}
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <TrackRow track={item} index={index + 1} onPress={() => onTrackPress(index)} />
        )}
        ListFooterComponent={<View style={{ height: 200 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  banner: {
    paddingHorizontal: 18,
    paddingBottom: 22,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: -10,
    justifyContent: 'center',
  },
  kind: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  name: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4,
  },
  description: {
    color: colors.white,
    fontSize: 14,
    marginTop: 6,
    opacity: 0.92,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  playRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    backgroundColor: colors.bg,
  },
  shuffleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  shuffleBtnActive: {
    backgroundColor: colors.accent,
  },
  playBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  stateWrap: {
    paddingHorizontal: 18,
    paddingTop: 18,
    backgroundColor: colors.bg,
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
