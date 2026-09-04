import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { RemoteArt } from './Art';
import { usePlayer } from '../player/PlayerContext';

export function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const { current, isPlaying, togglePlay, next } = usePlayer();

  if (!current) return null;

  return (
    <TouchableOpacity style={styles.bar} activeOpacity={0.85} onPress={onOpen}>

      <RemoteArt uri={current.thumb} size={44} radius={4} />
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {current.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {current.artist}
        </Text>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity
          hitSlop={8}
          style={styles.control}
          onPress={(e) => {
            e.stopPropagation?.();
            togglePlay();
          }}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={8}
          style={styles.control}
          onPress={(e) => {
            e.stopPropagation?.();
            next();
          }}
        >
          <Ionicons name="play-skip-forward" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24,24,28,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  meta: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  title: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  control: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
