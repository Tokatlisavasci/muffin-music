import React from 'react';
import { RemoteArt } from './Art';

interface Props {
  uri: string;
  size: number;
}

/**
 * Web build of the artwork slot — AdMob ads are native-only, so the web
 * version simply shows the album artwork. Native builds use
 * `PlayerArt.native.tsx`, which swaps in an AdMob banner ad when one fills.
 */
export function PlayerArtSlot({ uri, size }: Props) {
  return <RemoteArt uri={uri} size={size} radius={10} />;
}
