// Playlists are defined as { title, artist } pairs — the app resolves each to
// its best YouTube audio stream through the local Muffin Music server.

export interface SeedTrack {
  title: string;
  artist: string;
}

export interface SeedPlaylist {
  id: string;
  name: string;
  description: string;
  /** Two-stop gradient used as generated cover art. */
  gradient: [string, string];
  tracks: SeedTrack[];
}

const t = (title: string, artist: string): SeedTrack => ({ title, artist });

export const PLAYLISTS: SeedPlaylist[] = [
  {
    id: 'top-global',
    name: 'Global Top Hits',
    description: 'The hottest tracks right now. All hits, all day.',
    gradient: ['#38105c', '#0e4d64'],
    tracks: [
      t('Birds of a Feather', 'Billie Eilish'),
      t('Espresso', 'Sabrina Carpenter'),
      t('Good Luck, Babe!', 'Chappell Roan'),
      t('Beautiful Things', 'Benson Boone'),
      t('Lose Control', 'Teddy Swims'),
      t('Too Sweet', 'Hozier'),
      t('I Had Some Help', 'Post Malone'),
      t('Not Like Us', 'Kendrick Lamar'),
      t('Texas Hold Em', 'Beyonce'),
      t("We Can't Be Friends", 'Ariana Grande'),
      t('Saturn', 'SZA'),
      t('Water', 'Tyla'),
      t('Houdini', 'Dua Lipa'),
      t('Cruel Summer', 'Taylor Swift'),
      t('Vampire', 'Olivia Rodrigo'),
      t('Paint The Town Red', 'Doja Cat'),
    ],
  },
  {
    id: 'hiphop',
    name: 'Hip-Hop Hits',
    description: 'The rap game, front and center.',
    gradient: ['#5f0f40', '#310d3f'],
    tracks: [
      t('HUMBLE.', 'Kendrick Lamar'),
      t("God's Plan", 'Drake'),
      t('SICKO MODE', 'Travis Scott'),
      t('Like That', 'Future & Metro Boomin'),
      t('Rockstar', '21 Savage'),
      t('No Role Modelz', 'J. Cole'),
      t('Stronger', 'Kanye West'),
      t('Lose Yourself', 'Eminem'),
      t('See You Again', 'Tyler, The Creator'),
      t('A Milli', 'Lil Wayne'),
      t('fukumean', 'Gunna'),
      t('DNA.', 'Kendrick Lamar'),
    ],
  },
  {
    id: 'rock',
    name: 'Rock Classics',
    description: 'Legendary anthems that defined rock.',
    gradient: ['#7a3b1e', '#1c1c1c'],
    tracks: [
      t('Bohemian Rhapsody', 'Queen'),
      t("Don't Stop Me Now", 'Queen'),
      t('Stairway to Heaven', 'Led Zeppelin'),
      t('Back in Black', 'AC/DC'),
      t('Smells Like Teen Spirit', 'Nirvana'),
      t("Sweet Child O' Mine", "Guns N' Roses"),
      t('Paint It Black', 'The Rolling Stones'),
      t('Comfortably Numb', 'Pink Floyd'),
      t('Hotel California', 'Eagles'),
      t('Enter Sandman', 'Metallica'),
      t('Everlong', 'Foo Fighters'),
      t('Boulevard of Broken Dreams', 'Green Day'),
    ],
  },
  {
    id: 'chill',
    name: 'Chill Mix',
    description: 'Slow down with these mellow picks.',
    gradient: ['#184e68', '#1e3c58'],
    tracks: [
      t('Thinkin Bout You', 'Frank Ocean'),
      t('Get You', 'Daniel Caesar'),
      t('Apocalypse', 'Cigarettes After Sex'),
      t('Show Me How', 'Men I Trust'),
      t('Chamber of Reflection', 'Mac DeMarco'),
      t('Sofia', 'Clairo'),
      t('Space Song', 'Beach House'),
      t('Pluto Projector', 'Rex Orange County'),
      t('Evergreen', 'Omar Apollo'),
      t('Summertime Sadness', 'Lana Del Rey'),
    ],
  },
  {
    id: 'edm',
    name: 'EDM Bangers',
    description: 'Big room drops and festival anthems.',
    gradient: ['#004e66', '#3a0ca3'],
    tracks: [
      t('Wake Me Up', 'Avicii'),
      t('The Nights', 'Avicii'),
      t('Closer', 'The Chainsmokers'),
      t("Don't Let Me Down", 'The Chainsmokers'),
      t('Faded', 'Alan Walker'),
      t('Alone', 'Marshmello'),
      t('Summer', 'Calvin Harris'),
      t('Firestone', 'Kygo'),
      t('Animals', 'Martin Garrix'),
      t('Clarity', 'Zedd'),
      t('Titanium', 'David Guetta'),
      t("Don't You Worry Child", 'Swedish House Mafia'),
    ],
  },
  {
    id: 'turkish',
    name: 'Türkçe Pop',
    description: 'Türk popunun en sevilen parçaları.',
    gradient: ['#6d1b3a', '#8a2b45'],
    tracks: [
      t('Şımarık', 'Tarkan'),
      t('Dudu', 'Tarkan'),
      t('Gülümse', 'Sezen Aksu'),
      t('Haberin Yok Ölüyorum', 'Duman'),
      t('Cambaz', 'Mor ve Ötesi'),
      t('İki Yabancı', 'Teoman'),
      t('Sigara', 'Şebnem Ferah'),
      t('Bitti Rüya', 'Manga'),
      t('Dum Tek Tek', 'Hadise'),
      t('Miş Miş', 'Simge'),
      t('Öyle Kolaysa', 'Mabel Matiz'),
      t('Yak', 'Yüzyüzeyken Konuşuruz'),
    ],
  },
];

/** Virtual "playlist" backed by the user's liked songs. */
export const LIKED_ID = 'liked';

export const LIKED_META = {
  id: LIKED_ID,
  name: 'Liked Songs',
  description: 'Songs you have liked',
  gradient: ['#39226e', '#a1355f'],
} as const;

export function playlistById(id: string): SeedPlaylist | null {
  return PLAYLISTS.find((p) => p.id === id) ?? null;
}

export interface BrowseCategory {
  label: string;
  color: string;
  /** What gets searched on YouTube when tapped. */
  query: string;
}

export const CATEGORIES: BrowseCategory[] = [
  { label: 'Pop', color: '#b9375e', query: 'pop hits' },
  { label: 'Hip-Hop', color: '#ba5d07', query: 'hip hop hits' },
  { label: 'Rock', color: '#e8115b', query: 'rock classics' },
  { label: 'Chill', color: '#1e3264', query: 'chill songs mix' },
  { label: 'Electronic', color: '#148a08', query: 'electronic dance hits' },
  { label: 'Türkçe', color: '#e13300', query: 'türkçe pop şarkıları' },
  { label: 'Workout', color: '#e91429', query: 'workout music' },
  { label: 'Focus', color: '#7358ff', query: 'deep focus music' },
  { label: 'Party', color: '#dc148c', query: 'party hits' },
  { label: 'Latin', color: '#8d67ab', query: 'latin hits' },
  { label: 'Sleep', color: '#477d95', query: 'calm sleep music' },
  { label: 'Jazz', color: '#503750', query: 'jazz classics' },
];

/** Generated cover-art gradients for quick picks that have no artwork. */
export const QUICK_COLORS: readonly string[] = [
  '#8d67ab', '#1e3264', '#e8115b', '#148a08', '#503750', '#ba5d07',
  '#e91429', '#477d95', '#a56752', '#dc148c', '#7358ff', '#0d72ea',
];
