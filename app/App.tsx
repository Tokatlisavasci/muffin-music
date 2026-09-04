import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlayerProvider } from './src/player/PlayerContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <PlayerProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </PlayerProvider>
    </SafeAreaProvider>
  );
}
