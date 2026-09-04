import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { AD_UNIT_ID } from './adConfig';

type AdModule = typeof import('react-native-google-mobile-ads');

/**
 * The google-mobile-ads native module is only present in a development /
 * production build. It is missing in Expo Go, so the module is imported
 * lazily inside try/catch — any failure just renders nothing.
 */
async function tryLoadAdsModule(): Promise<AdModule | null> {
  try {
    const mod = await import('react-native-google-mobile-ads');
    if (!mod?.BannerAd || !mod?.BannerAdSize) return null;
    return mod;
  } catch {
    return null;
  }
}

/**
 * Small adaptive banner shown on the Home screen right under the quick-pick
 * grid (filling the ragged half-cell of the last row). The ad sits in normal
 * flow and takes its own space once loaded; on no-fill (or outside native
 * builds) the whole slot unmounts, so a failed request leaves no visible gap.
 */
export function HomeBanner() {
  const { width } = useWindowDimensions();
  const [mod, setMod] = useState<AdModule | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ads = await tryLoadAdsModule();
      if (!ads || !alive) return;
      setMod(ads);
      try {
        await ads.MobileAds().initialize();
      } catch {
        // Initialization failure -> show nothing.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!mod || failed) return null;

  return (
    <View style={styles.row}>
      <mod.BannerAd
        unitId={AD_UNIT_ID}
        size={mod.BannerAdSize.INLINE_ADAPTIVE_BANNER}
        width={Math.round(Math.min(width, 460))}
        maxHeight={120}
        onAdFailedToLoad={(error) => {
          console.warn(`[ads] home banner no fill (${AD_UNIT_ID}): ${String(error?.message ?? error)}`);
          setFailed(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 6,
  },
});
