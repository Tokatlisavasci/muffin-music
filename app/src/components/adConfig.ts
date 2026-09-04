/**
 * AdMob banner unit the user created.
 * AdMob unit (banner): ca-app-pub-7415475553930604/6728186063
 * App id (Android/iOS): ca-app-pub-7415475553930604~9386671828
 *   (registered in app.json via the react-native-google-mobile-ads config plugin)
 *
 * Override for testing without touching code:
 *   EXPO_PUBLIC_ADMOB_UNIT_ID=ca-app-pub-3940256099942544/6300978111 npx expo start
 * (the second value is AdMob's always-filling Android sample banner ad unit).
 */
export const REAL_AD_UNIT_ID = 'ca-app-pub-7415475553930604/6728186063';
export const TEST_AD_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';
export const AD_UNIT_ID =
  (process.env.EXPO_PUBLIC_ADMOB_UNIT_ID ?? '').trim() ||
  (process.env.EXPO_PUBLIC_ADMOB_TEST === '1' ? TEST_AD_UNIT_ID : REAL_AD_UNIT_ID);
