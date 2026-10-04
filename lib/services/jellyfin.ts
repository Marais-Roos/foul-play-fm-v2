/**
 * Jellyfin Music Service
 * Connects to self-hosted Jellyfin instance via Cloudflare Tunnel
 * to query playlists, tracks, audio stream URLs, and album art.
 */

import { Show } from '@/lib/types/station';

export interface JellyfinTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  durationFormatted: string;
  streamUrl: string;
  albumArtUrl?: string;
  playedAt?: string;       // e.g. "20:55"
  startedAt?: Date | number;
  showTitle?: string;
}

function getJellyfinHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'FoulPlayFM-Server/2.0',
    Accept: 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `MediaBrowser Token="${apiKey}"`;
    headers['X-Emby-Token'] = apiKey;
  }
  // Cloudflare WAF Bypass secret
  const bypassSecret = process.env.JELLYFIN_CF_BYPASS_SECRET;
  if (bypassSecret) {
    headers['x-cf-bypass'] = bypassSecret;
  }
  return headers;
}

function mapJellyfinItemToTrack(item: any, jellyfinUrl: string, apiKey?: string): JellyfinTrack {
  const ticks = item.RunTimeTicks || 0;
  const totalSecs = Math.floor(ticks / 10000000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const durationFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const streamUrl = `${jellyfinUrl}/Audio/${item.Id}/stream.mp3?static=true${apiKey ? `&api_key=${apiKey}` : ''}`;
  const albumArtUrl = `${jellyfinUrl}/Items/${item.Id}/Images/Primary`;

  return {
    id: item.Id,
    title: item.Name,
    artist: item.Artists?.[0] || item.AlbumArtist || 'Unknown Artist',
    album: item.Album || '',
    durationMs: Math.max(totalSecs * 1000, 180000),
    durationFormatted: totalSecs > 0 ? durationFormatted : '03:00',
    streamUrl,
    albumArtUrl,
  };
}

/**
 * Clean fallback tracks definition (empty by default; no fake satirical placeholders)
 */
export const FALLBACK_TRACKS: JellyfinTrack[] = [];

/**
 * Fetch all audio tracks from a specific Jellyfin Playlist by ID
 */
export async function getPlaylistTracks(playlistId: string): Promise<JellyfinTrack[]> {
  const jellyfinUrl = process.env.JELLYFIN_URL;
  const apiKey = process.env.JELLYFIN_API_KEY;
  const userId = process.env.JELLYFIN_USER_ID;

  if (!jellyfinUrl || !playlistId) {
    return [];
  }

  const headers = getJellyfinHeaders(apiKey);
  const validUserId = userId && /^[0-9a-fA-F]{32}$/.test(userId) ? userId : undefined;

  // Try standard Playlist endpoint with valid userId
  const endpoints: string[] = [];
  if (validUserId) {
    endpoints.push(`${jellyfinUrl}/Playlists/${playlistId}/Items?userId=${validUserId}&Fields=Artists,Album,RunTimeTicks`);
  }
  endpoints.push(`${jellyfinUrl}/Playlists/${playlistId}/Items?Fields=Artists,Album,RunTimeTicks`);
  endpoints.push(`${jellyfinUrl}/Items?parentId=${playlistId}&Fields=Artists,Album,RunTimeTicks`);

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers,
        next: { revalidate: 300 }, // Cache for 5 mins
      });

      if (res.ok) {
        const data = await res.json();
        const items = data.Items || [];
        if (items.length > 0) {
          return items.map((item: any) => mapJellyfinItemToTrack(item, jellyfinUrl, apiKey));
        }
      }
    } catch (err) {
      console.warn(`Jellyfin endpoint ${endpoint} failed:`, err);
    }
  }

  return [];
}

/**
 * Fetch tracks by genre or random search from universal /Items endpoint
 */
export async function getJellyfinTracks(genreOrTag?: string): Promise<JellyfinTrack[]> {
  const jellyfinUrl = process.env.JELLYFIN_URL;
  const apiKey = process.env.JELLYFIN_API_KEY;
  const userId = process.env.JELLYFIN_USER_ID;

  if (!jellyfinUrl) {
    return FALLBACK_TRACKS;
  }

  try {
    const params = new URLSearchParams({
      IncludeItemTypes: 'Audio',
      Recursive: 'true',
      Limit: '25',
      SortBy: 'Random',
      Fields: 'Artists,Album,RunTimeTicks',
    });

    if (genreOrTag) {
      params.append('Genres', genreOrTag);
    }
    const validUserId = userId && /^[0-9a-fA-F]{32}$/.test(userId) ? userId : undefined;
    if (validUserId) {
      params.append('userId', validUserId);
    }

    const endpoint = `${jellyfinUrl}/Items?${params.toString()}`;
    const headers = getJellyfinHeaders(apiKey);

    const res = await fetch(endpoint, { headers, next: { revalidate: 300 } });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Jellyfin API returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    let items = data.Items || [];

    // If genre filter returned 0 (e.g. tracks untagged with genre), query library without genre
    if (items.length === 0 && genreOrTag) {
      params.delete('Genres');
      const retryEndpoint = `${jellyfinUrl}/Items?${params.toString()}`;
      const retryRes = await fetch(retryEndpoint, { headers, next: { revalidate: 300 } });
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        items = retryData.Items || [];
      }
    }

    if (items.length === 0) return FALLBACK_TRACKS;

    return items.map((item: any) => mapJellyfinItemToTrack(item, jellyfinUrl, apiKey));
  } catch (err) {
    console.warn('Jellyfin connection error, returning fallback tracks:', err);
    return FALLBACK_TRACKS;
  }
}

/**
 * Fisher-Yates shuffle algorithm for true unbiased playlist randomization.
 */
export function shuffleTracks<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Get active track rotation for a show:
 * 1. Checks if the show has a Jellyfin Playlist ID configured (from Sanity or Station Bible).
 * 2. If playlist has tracks, shuffles them with Fisher-Yates.
 * 3. If no playlist ID or empty, falls back to genre query or satirical track list.
 */
export async function getShowTracks(show: Show): Promise<JellyfinTrack[]> {
  if (show.jellyfinPlaylistId) {
    const playlistTracks = await getPlaylistTracks(show.jellyfinPlaylistId);
    if (playlistTracks.length > 0) {
      return shuffleTracks(playlistTracks);
    }
  }

  // Fallback to genre query matching show vibe
  const genre = show.musicGenres?.[0] || show.vibe;
  const tracks = await getJellyfinTracks(genre);
  return tracks.length > 0 ? shuffleTracks(tracks) : FALLBACK_TRACKS;
}
