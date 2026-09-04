import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { LIKED_META, PLAYLISTS } from '../lib/seeds';
import { PlaylistTile, QuickPickRow, SectionHeader } from '../components/Cards';
import { HomeBanner } from '../components/HomeBanner';

type Nav = { navigate: (screen: string, params?: object) => void };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Cards shown in the 2-column quick grid. */
const quickPicks: { id: string; name: string; gradient: readonly [string, string] }[] = [
  { id: LIKED_META.id, name: LIKED_META.name, gradient: LIKED_META.gradient },
  ...PLAYLISTS.map((p) => ({ id: p.id, name: p.name, gradient: p.gradient })),
];

const madeForYou = [PLAYLISTS[0], PLAYLISTS[1], PLAYLISTS[2], PLAYLISTS[3]];
const topMixes = [PLAYLISTS[4], PLAYLISTS[5], PLAYLISTS[1], PLAYLISTS[3]];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: greeting + avatar */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting()}</Text>
          </View>
          <TouchableOpacity style={styles.avatar} activeOpacity={0.8}>
            <Text style={styles.avatarText}>C</Text>
          </TouchableOpacity>
        </View>

        {/* Recently-played style quick grid */}
        <View style={styles.grid}>
          {quickPicks.map((p) => (
            <QuickPickRow
              key={p.id}
              pl={p}
              onPress={() => navigation.navigate('Playlist', { source: p.id })}
            />
          ))}
        </View>

        {/* Small ad filling the ragged area under the last quick-pick row */}
        <HomeBanner />

        <SectionHeader title="Made For You" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.rowInner}>
            {madeForYou.map((p) => (
              <PlaylistTile
                key={p.id}
                pl={p}
                onPress={() => navigation.navigate('Playlist', { source: p.id })}
              />
            ))}
          </View>
        </ScrollView>

        <SectionHeader title="Your Top Mixes" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.rowInner}>
            {topMixes.map((p) => (
              <PlaylistTile
                key={p.id}
                pl={p}
                onPress={() => navigation.navigate('Playlist', { source: p.id })}
              />
            ))}
          </View>
        </ScrollView>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 210,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    color: colors.white,
    fontSize: 27,
    fontWeight: '800',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.black,
    fontWeight: '800',
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  rowInner: {
    flexDirection: 'row',
  },
});
