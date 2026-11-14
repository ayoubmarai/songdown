
import type { VideoSummary } from "@distube/ytdl-core";

export interface Track {
  trackUri: string;
  isrc: string;
  trackName: string;
  albumName: string;
  artistNameS: string;
  releaseDate: string;
  durationMs: string;
  popularity: string;
  explicit: string;
  addedBy: string;
  addedAt: string;
  genres: string;
  recordLabel: string;
  danceability: string;
  energy: string;
  key: string;
  loudness: string;
  mode: string;
  speechiness: string;
  acousticness: string;
  instrumentalness: string;
  liveness: string;
  valence: string;
  tempo: string;
  timeSignature: string;
}

export interface SearchResult {
  trackName: string;
  artist: string;
  album: string;
  length: number;
  results: readonly VideoSummary[];
  index: number;
}

