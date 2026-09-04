import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { PlaylistScreen } from '../screens/PlaylistScreen';
import { PlayerScreen } from '../screens/PlayerScreen';
import { MiniPlayer } from '../components/MiniPlayer';
import type { RootStackParamList, TabParamList } from './types';

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.bg,
    text: colors.white,
    border: 'transparent',
  },
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const SHAPE_ACTIVE = colors.accent;
const SHAPE_INACTIVE = 'rgba(24,24,28,0.82)';
const GLYPH_ACTIVE = colors.black;
const GLYPH_INACTIVE = 'rgba(255,255,255,0.72)';

const TAB_ICONS: Record<keyof TabParamList, { active: any; idle: any; label: string }> = {
  Home: { active: 'home', idle: 'home-outline', label: 'Home' },
  Search: { active: 'search', idle: 'search-outline', label: 'Search' },
  Library: { active: 'library', idle: 'library-outline', label: 'Your Library' },
};

type OverlayState = { top: string; activeTab: string | null };

/**
 * Floating bottom buttons — Apple-Music-inspired, no coating behind them.
 * Rendered at the ROOT (via the container ref) so they stay visible on pushed
 * screens such as the playlist; only the full-screen player hides them.
 */
function TabOverlay({ nav }: { nav: any }) {
  const insets = useSafeAreaInsets();
  const [lastTab, setLastTab] = useState<keyof TabParamList>('Home');
  const [snap, setSnap] = useState<OverlayState>({ top: 'Tabs', activeTab: null });
  const snapRef = useRef<OverlayState>(snap);
  snapRef.current = snap;

  const update = useCallback(() => {
    const root = nav.getRootState?.();
    if (!root?.routes?.length) return;
    const top = (root.routes[root.index]?.name as string) ?? 'Tabs';
    let activeTab: string | null = null;
    const cur = root.routes[root.index];
    if (cur?.name === 'Tabs' && cur.state && cur.state.index != null) {
      activeTab = (cur.state.routes?.[cur.state.index]?.name as string) ?? null;
    }
    setSnap({ top, activeTab });
  }, [nav]);

  useEffect(() => {
    // initial snapshot
    update();
    const unsub = nav.addListener?.('state', update);
    return () => unsub?.();
  }, [nav, update]);

  if (snap.top === 'Player') return null;

  const activeName = snap.activeTab ?? lastTab;

  const go = (name: keyof TabParamList) => {
    setLastTab(name);
    nav.navigate('Tabs', { screen: name });
  };

  const renderTab = (name: keyof TabParamList, capsule = false) => {
    const active = activeName === name;
    const icon = active ? TAB_ICONS[name].active : TAB_ICONS[name].idle;
    return (
      <Pressable
        key={name}
        onPress={() => go(name)}
        style={({ pressed }) => [
          capsule ? styles.capsule : styles.circle,
          { backgroundColor: active ? SHAPE_ACTIVE : SHAPE_INACTIVE },
          pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
        ]}
      >
        <Ionicons name={icon} size={capsule ? 19 : 22} color={active ? GLYPH_ACTIVE : GLYPH_INACTIVE} />
        {capsule ? (
          <Text style={[styles.capsuleLabel, { color: active ? GLYPH_ACTIVE : GLYPH_INACTIVE }]}>
            {TAB_ICONS[name].label}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={styles.overlayRoot}>
      <View style={[styles.overlay, { paddingBottom: insets.bottom + 10 }]}>
        <MiniPlayer onOpen={() => nav.navigate('Player')} />
        <View pointerEvents="box-none" style={styles.row}>
          {renderTab('Home')}
          {renderTab('Search', true)}
          {renderTab('Library')}
        </View>
      </View>
    </View>
  );
}

/** Tabs have no built-in bar — the root overlay is the only tab bar. */
function Tabs() {
  return (
    <Tab.Navigator
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const navRef = useNavigationContainerRef<RootStackParamList>();
  return (
    <NavigationContainer ref={navRef} theme={navTheme}>
      <View style={{ flex: 1 }}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen
            name="Playlist"
            component={PlaylistScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
        </Stack.Navigator>
        <TabOverlay nav={navRef} />
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },
  overlay: {
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  capsule: {
    height: 42,
    minWidth: 116,
    borderRadius: 21,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  capsuleLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 7,
    letterSpacing: 0.2,
  },
});
