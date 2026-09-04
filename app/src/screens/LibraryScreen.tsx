import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { LIKED_META, PLAYLISTS } from '../lib/seeds';
import { PlaylistCover } from '../components/Art';
import { usePlayer } from '../player/PlayerContext';

type Nav = { navigate: (screen: string, params?: object) => void };

function LibraryRow({
  art,
  title,
  subtitle,
  onPress,
}: {
  art: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      {art}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { liked } = usePlayer();
  const likedCount = Object.keys(liked).length;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 210 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Your Library</Text>

        <LibraryRow
          art={<PlaylistCover gradient={LIKED_META.gradient} size={56} radius={4} icon="heart" />}
          title={LIKED_META.name}
          subtitle={likedCount > 0 ? `Playlist • ${likedCount} song${likedCount === 1 ? '' : 's'}` : 'Songs you like'}
          onPress={() => navigation.navigate('Playlist', { source: LIKED_META.id })}
        />

        {PLAYLISTS.map((pl) => (
          <LibraryRow
            key={pl.id}
            art={<PlaylistCover gradient={pl.gradient} label={pl.name} size={56} radius={4} />}
            title={pl.name}
            subtitle={`Playlist • ${pl.tracks.length} songs`}
            onPress={() => navigation.navigate('Playlist', { source: pl.id })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
  },
  title: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
});
