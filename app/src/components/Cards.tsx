import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';
import { PlaylistCover } from './Art';
import type { BrowseCategory, SeedPlaylist } from '../lib/seeds';

// ---------------------------------------------------------------------------
// Section header ("Made For You", "Your Top Mixes", ...)
// ---------------------------------------------------------------------------

export function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionTitle} numberOfLines={1}>
      {title}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// "Recently played"-style row used in the 2-column home grid
// ---------------------------------------------------------------------------

export function QuickPickRow({
  pl,
  onPress,
}: {
  pl: { name: string; gradient: readonly [string, string] } | SeedPlaylist;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickRow} activeOpacity={0.7} onPress={onPress}>
      <PlaylistCover gradient={pl.gradient} label={pl.name} size={54} radius={0} />
      <View style={styles.quickRowText}>
        <Text style={styles.quickRowName} numberOfLines={1}>
          {pl.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Horizontal-scroll card with square cover art + meta ("Made For You", ...)
// ---------------------------------------------------------------------------

export function PlaylistTile({
  pl,
  onPress,
  width = 156,
}: {
  pl: { name: string; description?: string; gradient: readonly [string, string] } | SeedPlaylist;
  onPress: () => void;
  width?: number;
}) {
  return (
    <TouchableOpacity style={[styles.tile, { width }]} activeOpacity={0.75} onPress={onPress}>
      <PlaylistCover gradient={pl.gradient} label={pl.name} size={width} radius={6} />
      <Text style={styles.tileTitle} numberOfLines={1}>
        {pl.name}
      </Text>
      <Text style={styles.tileSubtitle} numberOfLines={1}>
        {'description' in pl && pl.description ? pl.description : 'Playlist'}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Browse-all category tile (Search screen)
// ---------------------------------------------------------------------------

export function CategoryTile({ cat, onPress }: { cat: BrowseCategory; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{ width: '48.5%', marginBottom: 8 }}>
      <View style={[styles.categoryTile, { backgroundColor: cat.color }]}>
        <Text style={styles.categoryLabel} numberOfLines={2}>
          {cat.label}
        </Text>
        <MaterialCommunityIcons
          name="music-note"
          size={54}
          color="rgba(255,255,255,0.25)"
          style={styles.categoryIcon}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 20,
  },
  quickRow: {
    width: '48.5%',
    height: 54,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickRowText: {
    flex: 1,
    paddingHorizontal: 8,
  },
  quickRowName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  tile: {
    marginRight: 14,
  },
  tileTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  tileSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  categoryTile: {
    height: 104,
    borderRadius: 6,
    padding: 10,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  categoryLabel: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  categoryIcon: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    transform: [{ rotate: '20deg' }],
  },
});
