/**
 * Web build of the home banner slot — AdMob ads are native-only, so this
 * renders nothing on web. Native builds use `HomeBanner.native.tsx`, which
 * shows an AdMob banner ad (and nothing at all when no ad is available).
 */
export function HomeBanner() {
  return null;
}
