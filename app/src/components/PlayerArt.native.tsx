import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { RemoteArt } from './Art';
import { AD_UNIT_ID } from './adConfig';

type AdModule = typeof import('react-native-google-mobile-ads');

/**
 * The google-mobile-ads native module is only present in a development /
 * production build. It is missing in Expo Go, so the module is imported
 * lazily inside try/catch — any failure just falls back to the artwork.
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

interface Props {
  uri: string;
  size: number;
}

/**
 * Replaces the big artwork on the full-screen player with an AdMob banner ad
 * whenever one is available. While the ad loads (or when ads are unavailable,
 * e.g. Expo Go / no fill) the regular artwork is shown instead.
 *
 * Banner ads report load results through events (onAdLoaded / onAdFailedToLoad)
 * rather than promises, so no timeout is needed here.
 */
/**
 * How often to fetch a fresh banner. The currently visible ad stays up while
 * the replacement loads, so a failed refresh is invisible to the user.
 * Google's guidance is not to refresh banners faster than ~30-60s.
 */
const BANNER_REFRESH_MS = 60000;

export function PlayerArtSlot({ uri, size }: Props) {
  const [mod, setMod] = useState<AdModule | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const bannerRef = useRef<{ load: () => void } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ads = await tryLoadAdsModule();
      if (!ads || !alive) return;
      setMod(ads);
      try {
        await ads.MobileAds().initialize();
      } catch {
        // Initialization failure -> keep artwork.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Refresh the banner on a timer for as long as this screen stays open.
  // The old creative remains visible until the new one has loaded.
  useEffect(() => {
    if (!mod || !ready) return;
    const id = setInterval(() => {
      try {
        bannerRef.current?.load();
      } catch {
        // Ignore refresh failures - the current ad keeps showing.
      }
    }, BANNER_REFRESH_MS);
    return () => clearInterval(id);
  }, [mod, ready]);

  const showBanner = !!mod && ready;

  return (
    <View style={[styles.stage, { width: size, height: size }]}>
      {!showBanner ? <RemoteArt uri={uri} size={size} radius={10} /> : null}

      {mod && !failed ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.bannerWrap,
            // Keep the banner mounted while it loads so the ad request happens;
            // only fade it in once an ad actually arrived.
            ready ? styles.bannerVisible : styles.bannerHidden,
          ]}
          pointerEvents={ready ? 'auto' : 'none'}
        >
          <mod.BannerAd
            ref={(instance) => {
              bannerRef.current = instance;
            }}
            unitId={AD_UNIT_ID}
            size={mod.BannerAdSize.INLINE_ADAPTIVE_BANNER}
            width={Math.round(size)}
            onAdLoaded={() => setReady(true)}
            onAdFailedToLoad={(error) => {
              console.warn(`[ads] banner no fill (${AD_UNIT_ID}): ${String(error?.message ?? error)}`);
              // Only fall back to the artwork when the FIRST load failed;
              // a failed refresh should keep the ad that is already showing.
              if (!ready) setFailed(true);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
  },
  bannerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,16,20,0.86)',
  },
  bannerVisible: {
    opacity: 1,
  },
  bannerHidden: {
    opacity: 0,
  },
});
