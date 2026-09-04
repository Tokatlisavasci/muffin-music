/** A playable song, resolved from a YouTube search result. */
export interface Track {
  /** YouTube video id. */
  id: string;
  /** Cleaned song title. */
  title: string;
  /** Channel/artist name (server-side cleaned). */
  artist: string;
  /** Length in seconds, when known. */
  duration: number | null;
  /** YouTube thumbnail URL. */
  thumb: string;
}
