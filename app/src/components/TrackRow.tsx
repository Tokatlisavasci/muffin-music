import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { fmtTime } from '../lib/format';
import { usePlayer } from '../player/PlayerContext';
import type { Track } from '../types';

interface Props {
  track: Track;
  /** Show a numeric index instead of artwork (Spotify playlist rows). */
  index?: number;
  onPress: () => void;
  showLikedIcon?: boolean;
  trailing?: string;
}

export function TrackRow({ track, index, onPress, showLikedIcon = true, trailing }: Props) {
  const { current, isPlaying, liked, toggleLike } = usePlayer();
  const isCurrent = current?.id === track.id;
  const likedHere = !!liked[track.id];

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={onPress}>
      {index !== undefined ? (
        <View style={styles.indexWrap}>
          {isCurrent && isPlaying ? (
            <Ionicons name="volume-high" size={15} color={colors.accent} />
          ) : (
            <Text style={[styles.index, isCurrent && styles.indexCurrent]}>{index}</Text>
          )}
        </View>
      ) : null}

      <View style={styles.main}>
        <Text
          style={[styles.title, isCurrent && styles.titleCurrent]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {track.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>

      {showLikedIcon ? (
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => toggleLike(track)}
          style={styles.likeBtn}
        >
          <Ionicons
            name={likedHere ? 'heart' : 'heart-outline'}
            size={17}
            color={likedHere ? colors.accent : colors.textMuted}
          />
        </TouchableOpacity>
      ) : null}

      {trailing || track.duration ? (
        <Text style={styles.trailing}>{trailing ?? fmtTime(track.duration)}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  indexWrap: {
    width: 28,
    alignItems: 'center',
  },
  index: {
    color: colors.textFaint,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  indexCurrent: {
    color: colors.accent,
  },
  main: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '500',
  },
  titleCurrent: {
    color: colors.accent,
  },
  artist: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  likeBtn: {
    paddingHorizontal: 4,
  },
  trailing: {
    color: colors.textMuted,
    fontSize: 13,
    marginLeft: 6,
    fontVariant: ['tabular-nums'],
  },
});
