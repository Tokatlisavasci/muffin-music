import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';
import { hashColor } from '../lib/format';

const FALLBACK_PALETTE = ['#1e3264', '#8d67ab', '#b9375e', '#148a08', '#503750', '#ba5d07', '#0d72ea'];

/**
 * Remote art with a graceful fallback (colored tile + music note) so layout
 * never breaks when a thumbnail 404s or the network is down.
 */
export function RemoteArt({
  uri,
  size,
  radius = 4,
  style,
}: {
  uri: string | null;
  size: number;
  radius?: number;
  style?: object;
}) {
  const [failed, setFailed] = useState(false);
  const bg = hashColor(uri ?? 'x', FALLBACK_PALETTE);

  if (!uri || failed) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        <MaterialCommunityIcons name="music-note" size={Math.round(size * 0.45)} color="rgba(255,255,255,0.85)" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[{ width: size, height: size, borderRadius: radius, backgroundColor: bg }, style]}
      contentFit="cover"
      transition={120}
      onError={() => setFailed(true)}
    />
  );
}

/** Generated cover for seed playlists: gradient tile + first letter of the name. */
export function PlaylistCover({
  gradient,
  label,
  size,
  radius = 6,
  icon,
}: {
  gradient: readonly [string, string];
  label?: string;
  size: number;
  radius?: number;
  icon?: 'heart';
}) {
  return (
    <LinearGradient
      colors={gradient as [string, string]}
      start={{ x: 0.05, y: 0.08 }}
      end={{ x: 0.95, y: 0.9 }}
      style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}
    >
      {icon === 'heart' ? (
        <MaterialCommunityIcons name="heart" size={Math.round(size * 0.5)} color="rgba(255,255,255,0.9)" />
      ) : null}
      <MaterialCommunityIcons
        name="music-note"
        size={Math.round(size * 0.42)}
        color="rgba(255,255,255,0.22)"
        style={{ position: 'absolute', right: size * 0.07, bottom: size * 0.03 }}
      />
      {label && size >= 96 ? (
        <View style={styles.coverLabelWrap}>
          <Text numberOfLines={2} style={[styles.coverLabelText, { fontSize: Math.max(11, size * 0.12) }]}>
            {label}
          </Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  coverLabelWrap: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    padding: 6,
  },
  coverLabelText: {
    color: colors.white,
    fontWeight: '800',
    letterSpacing: 0.2,
    paddingHorizontal: 8,
    paddingTop: 10,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 4,
  },
});
