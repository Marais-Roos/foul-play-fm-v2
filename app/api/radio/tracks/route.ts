import { NextRequest, NextResponse } from 'next/server';
import { getCurrentShow, getShowById } from '@/lib/data/station';
import { getShowTracks, getPlaylistTracks, getJellyfinTracks, FALLBACK_TRACKS } from '@/lib/services/jellyfin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showId = searchParams.get('showId');
    const playlistId = searchParams.get('playlistId');

    // 1. Direct playlist query if requested
    if (playlistId) {
      const playlistTracks = await getPlaylistTracks(playlistId);
      if (playlistTracks.length > 0) {
        return NextResponse.json({
          success: true,
          source: 'jellyfin_playlist',
          tracks: playlistTracks,
        });
      }
    }

    // 2. Resolve Show
    const show = showId ? getShowById(showId) || getCurrentShow() : getCurrentShow();

    // 3. Fetch Show Tracks (Checks playlist -> genre -> fallback)
    const tracks = await getShowTracks(show);

    return NextResponse.json({
      success: true,
      showId: show.id,
      showTitle: show.title,
      playlistId: show.jellyfinPlaylistId || null,
      source: show.jellyfinPlaylistId ? 'jellyfin_playlist' : 'jellyfin_library',
      tracks: tracks.length > 0 ? tracks : FALLBACK_TRACKS,
    });
  } catch (error) {
    console.error('Error fetching radio tracks:', error);
    return NextResponse.json(
      {
        success: false,
        source: 'fallback',
        tracks: FALLBACK_TRACKS,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 } // Return 200 with fallback so player doesn't fail
    );
  }
}
