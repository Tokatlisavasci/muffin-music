import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';
import { fmtTime } from '../lib/format';
import { PlayerArtSlot } from '../components/PlayerArt';
import { SeekBar } from '../components/SeekBar';
import { usePlayer, useProgress } from '../player/PlayerContext';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

export function PlayerScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    current,
    isPlaying,
    repeat,
    shuffle,
    liked,
    contextLabel,
    queueDisplay,
    queuePos,
    togglePlay,
    next,
    prev,
    seekTo,
    toggleShuffle,
    cycleRepeat,
    toggleLike,
    jumpTo,
  } = usePlayer();
  const progress = useProgress();
  const [upNext, setUpNext] = useState(false);

  const artSize = Math.min(width - 64, 360);
  const likedHere = current ? !!liked[current.id] : false;

  const contextText = contextLabel ? contextLabel.toUpperCase() : '';

  return (
    <View style={styles.root}>
      {/* Blurred backdrop */}
      {current ? (
        <>
          <Image
            source={{ uri: current.thumb }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            blurRadius={90}
          />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,10,14,0.62)' }]} />
          </View>
        </>
      ) : null}

      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 14 }]}>
        {/* Top row */}
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.topBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-down" size={28} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.topCenter}>
            {contextText ? (
              <>
                <Text style={styles.topLabel}>PLAYING FROM</Text>
                <Text style={styles.topContext} numberOfLines={1}>
                  {contextText}
                </Text>
              </>
            ) : (
              <Text style={styles.topLabel}>MUFFIN MUSIC</Text>
            )}
          </View>
          <View style={styles.topBtn} />
        </View>

        {!current ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Nothing is playing right now.</Text>
          </View>
        ) : (
          <>
            {/* Artwork — replaced by an AdMob banner ad when one fills */}
            <View style={styles.artWrap}>
              <PlayerArtSlot uri={current.thumb} size={artSize} />
            </View>

            {/* Title / artist */}
            <View style={styles.titleWrap}>
              <Text style={styles.title} numberOfLines={1}>
                {current.title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {current.artist}
              </Text>
            </View>

            {/* Seek */}
            <View style={styles.seekWrap}>
              <SeekBar
                position={progress.position}
                duration={progress.duration || current.duration || 0}
                onSeek={seekTo}
                alwaysShowKnob
                height={30}
              />
              <View style={styles.timeRow}>
                <Text style={styles.time}>{fmtTime(progress.position)}</Text>
                <Text style={styles.time}>{fmtTime(progress.duration || current.duration)}</Text>
              </View>
            </View>

            {/* Controls */}
            <View style={styles.controlsRow}>
              <TouchableOpacity onPress={toggleShuffle} hitSlop={10} style={styles.sideBtn}>
                <MaterialCommunityIcons
                  name="shuffle"
                  size={22}
                  color={shuffle ? colors.accent : colors.textMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={prev} hitSlop={10} style={styles.skipBtn}>
                <Ionicons name="play-skip-back" size={34} color={colors.white} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={togglePlay}
                style={[styles.playBtn, { width: 66, height: 66, borderRadius: 33 }]}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={32}
                  color={colors.black}
                  style={isPlaying ? {} : { marginLeft: 3 }}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={next} hitSlop={10} style={styles.skipBtn}>
                <Ionicons name="play-skip-forward" size={34} color={colors.white} />
              </TouchableOpacity>

              <TouchableOpacity onPress={cycleRepeat} hitSlop={10} style={styles.sideBtn}>
                <MaterialCommunityIcons
                  name={repeat === 'one' ? 'repeat-once' : 'repeat'}
                  size={22}
                  color={repeat !== 'off' ? colors.accent : colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Bottom icons */}
            <View style={styles.bottomRow}>
              <TouchableOpacity onPress={() => current && toggleLike(current)} hitSlop={10}>
                <Ionicons
                  name={likedHere ? 'heart' : 'heart-outline'}
                  size={24}
                  color={likedHere ? colors.accent : colors.white}
                />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => setUpNext(true)} hitSlop={10}>
                <Ionicons name="list" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Up Next bottom sheet */}
      <Modal
        visible={upNext}
        transparent
        animationType="slide"
        onRequestClose={() => setUpNext(false)}
      >
        <TouchableOpacity style={styles.modalScrim} activeOpacity={1} onPress={() => setUpNext(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Up Next</Text>
            <TouchableOpacity onPress={() => setUpNext(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={queueDisplay}
            keyExtractor={(t, i) => `${t.id}-${i}`}
            renderItem={({ item, index }) => {
              const active = index === queuePos;
              return (
                <TouchableOpacity
                  style={styles.queueRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setUpNext(false);
                    jumpTo(index);
                  }}
                >
                  <View style={styles.queueRowMain}>
                    <Text
                      style={[styles.queueTitle, active && { color: colors.accent }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.queueArtist} numberOfLines={1}>
                      {item.artist}
                    </Text>
                  </View>
                  {active ? (
                    <Ionicons name="volume-high" size={15} color={colors.accent} />
                  ) : (
                    <Text style={styles.queueIdx}>{index + 1}</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#17171c',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  topContext: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  artWrap: {
    alignItems: 'center',
    marginTop: 22,
  },
  titleWrap: {
    marginTop: 28,
    alignItems: 'center',
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  artist: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: 5,
    textAlign: 'center',
  },
  seekWrap: {
    marginTop: 16,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -6,
  },
  time: {
    color: colors.textMuted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sideBtn: {
    padding: 6,
  },
  skipBtn: {
    padding: 6,
  },
  playBtn: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#242424',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '58%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '800',
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  queueRowMain: {
    flex: 1,
    marginRight: 12,
  },
  queueTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  queueArtist: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 1,
  },
  queueIdx: {
    color: colors.textFaint,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});
