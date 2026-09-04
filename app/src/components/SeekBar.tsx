import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
  /** show the round knob even when not dragging */
  alwaysShowKnob?: boolean;
  height?: number;
}

export function SeekBar({ position, duration, onSeek, alwaysShowKnob = false, height = 40 }: Props) {
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubPos, setScrubPos] = useState(0);
  const widthRef = useRef(1);
  // Latest scrub x in px, kept in a ref so the PanResponder release handler
  // (which closes over the value at memo time) never reads a stale value.
  const scrubRef = useRef(0);
  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;

  const total = duration > 0 ? duration : 0;
  const ratio = total > 0 ? Math.max(0, Math.min(1, position / total)) : 0;
  const shownRatio = scrubbing ? Math.max(0, Math.min(1, scrubPos / (widthRef.current || 1))) : ratio;

  const setScrubX = useCallback((rawX: number) => {
    const w = widthRef.current;
    const x = Math.max(0, Math.min(w, rawX));
    scrubRef.current = x;
    setScrubPos(x);
  }, []);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => setScrubX(evt.nativeEvent.locationX),
        onPanResponderMove: (evt) => setScrubX(evt.nativeEvent.locationX),
        onPanResponderRelease: () => {
          if (total > 0) {
            onSeekRef.current((scrubRef.current / (widthRef.current || 1)) * total);
          }
          setScrubbing(false);
        },
        onPanResponderTerminate: () => setScrubbing(false),
      }),
    [total, setScrubX]
  );

  const onLayout = useCallback((e: any) => {
    widthRef.current = e.nativeEvent.layout.width || 1;
  }, []);

  return (
    <View
      style={[styles.touchZone, { height }]}
      onLayout={onLayout}
      {...pan.panHandlers}
      accessible={false}
    >
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${shownRatio * 100}%` }]} />
      </View>
      <View
        style={[
          styles.knob,
          {
            left: `${shownRatio * 100}%`,
            opacity: alwaysShowKnob || scrubbing ? 1 : 0,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  touchZone: {
    justifyContent: 'center',
  },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  trackFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.white,
  },
  knob: {
    position: 'absolute',
    top: '50%',
    marginTop: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.white,
    marginLeft: -6,
  },
});
