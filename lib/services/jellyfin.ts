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
}

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function getJellyfinHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': BROWSER_USER_AGENT,
    Accept: 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `MediaBrowser Token="${apiKey}"`;
    headers['X-Emby-Token'] = apiKey;
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
 * Satirical fallback tracks for Foul Play FM when Jellyfin is offline or starting up
 */
export const FALLBACK_TRACKS: JellyfinTrack[] = [
  {
    id: 'fp-track-1',
    title: 'Stage 6 Disco (Generator Breakdown)',
    artist: 'Eskom Youth Choir',
    album: 'Gauteng Blackout Vol. 4',
    durationMs: 194000,
    durationFormatted: '03:14',
    streamUrl: '/api/audio/voice?file=data/voices/main_presenters/tony_tatum_sample.mp3',
  },
  {
    id: 'fp-track-2',
    title: 'Buccleuch Taxi Drag Race',
    artist: 'Hiace Turbo Syndicate',
    album: 'N1 Emergency Lane Anthems',
    durationMs: 221000,
    durationFormatted: '03:41',
    streamUrl: '/api/audio/voice?file=data/voices/main_presenters/benny_st_pierre_sample.mp3',
  },
  {
    id: 'fp-track-3',
    title: 'Crypto Borewors & The Hadeda Scream',
    artist: 'Dividend Dave & The Pundits',
    album: 'Sandton Ponzi Beats',
    durationMs: 182000,
    durationFormatted: '03:02',
    streamUrl: '/api/audio/voice?file=data/voices/side_characters/dividend_dave_sample.mp3',
  },
  {
    id: 'fp-track-4',
    title: 'Pothole Slalom (Vereeniging Nights)',
    artist: 'Suspension Killer',
    album: 'Vaal River Blues',
    durationMs: 205000,
    durationFormatted: '03:25',
    streamUrl: '/api/audio/voice?file=data/voices/main_presenters/cynthia_blight_sample.mp3',
  },
  {
    id: 'fp-track-5',
    title: 'Chopper Dogfight Over Sandton City',
    artist: 'Simon Carter & Chopper One',
    album: 'Traffic Radar Mayhem',
    durationMs: 215000,
    durationFormatted: '03:35',
    streamUrl: '/api/audio/voice?file=data/voices/side_characters/simon_carter_sample.mp3',
  },
];

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
 * Get active track rotation for a show:
 * 1. Checks if the show has a Jellyfin Playlist ID configured (from Sanity or Station Bible).
 * 2. If playlist has tracks, shuffles them.
 * 3. If no playlist ID or empty, falls back to genre query or satirical track list.
 */
export async function getShowTracks(show: Show): Promise<JellyfinTrack[]> {
  if (show.jellyfinPlaylistId) {
    const playlistTracks = await getPlaylistTracks(show.jellyfinPlaylistId);
    if (playlistTracks.length > 0) {
      // Return a shuffled copy
      return [...playlistTracks].sort(() => Math.random() - 0.5);
    }
  }

  // Fallback to genre query matching show vibe
  const genre = show.musicGenres?.[0] || show.vibe;
  const tracks = await getJellyfinTracks(genre);
  return tracks.length > 0 ? tracks : FALLBACK_TRACKS;
}
