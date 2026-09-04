import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { CATEGORIES } from '../lib/seeds';
import { searchSongs, serverBaseSync } from '../lib/api';
import { usePlayer } from '../player/PlayerContext';
import { CategoryTile } from '../components/Cards';
import { TrackRow } from '../components/TrackRow';
import type { Track } from '../types';

export function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { playList } = usePlayer();

  const [text, setText] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const seqRef = useRef(0);

  const query = text.trim();

  useEffect(() => {
    const seq = ++seqRef.current;
    if (!query) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    const timer = setTimeout(() => {
      searchSongs(query, 14)
        .then((hits) => {
          if (seqRef.current !== seq) return;
          setResults(hits);
          setLoading(false);
        })
        .catch(() => {
          if (seqRef.current !== seq) return;
          setError(true);
          setLoading(false);
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const onPickCategory = (categoryQuery: string) => {
    setText(categoryQuery);
    Keyboard.dismiss();
  };

  const searching = query.length > 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      {/* Search pill */}
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="What do you want to play?"
          placeholderTextColor="#8f8f8f"
          returnKeyType="search"
          autoCorrect={false}
        />
        {text.length > 0 ? (
          <TouchableOpacity onPress={() => setText('')} hitSlop={8} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 170 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!searching ? (
          <>
            <Text style={styles.browseTitle}>Browse all</Text>
            <View style={styles.grid}>
              {CATEGORIES.map((cat) => (
                <CategoryTile key={cat.label} cat={cat} onPress={() => onPickCategory(cat.query)} />
              ))}
            </View>
          </>
        ) : loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 28 }} />
        ) : error ? (
          <Text style={styles.statusText}>
            Could not reach the Muffin Music server ({serverBaseSync()}). Is it running? (see README)
          </Text>
        ) : results.length === 0 ? (
          <Text style={styles.statusText}>No results for “{query}”.</Text>
        ) : (
          <>
            <Text style={styles.songsTitle}>Songs</Text>
            {results.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={undefined}
                onPress={() => playList(results, i, 'Search')}
              />
            ))}
            <View style={{ height: 30 }} />
          </>
        )}
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
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 4,
    height: 46,
  },
  input: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  browseTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  songsTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 4,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 12,
    lineHeight: 22,
  },
});
