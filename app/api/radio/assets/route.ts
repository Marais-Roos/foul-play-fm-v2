import { NextResponse } from 'next/server';
import {
  getR2AssetCatalog,
  getRandomAdvert,
  getRandomSweeper,
  getShowSweeper,
  getNewsBed,
  getTrafficAmbience,
} from '@/lib/services/r2';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const showId = searchParams.get('showId');

  try {
    if (type === 'random-ad') {
      const ad = await getRandomAdvert();
      return NextResponse.json({ asset: ad });
    }

    if (type === 'random-sweeper') {
      if (showId) {
        const showSweeper = await getShowSweeper(showId);
        if (showSweeper) {
          return NextResponse.json({ asset: showSweeper });
        }
      }
      const sweeper = await getRandomSweeper();
      return NextResponse.json({ asset: sweeper });
    }

    if (type === 'show-sweeper' && showId) {
      const showSweeper = await getShowSweeper(showId);
      if (showSweeper) {
        return NextResponse.json({ asset: showSweeper });
      }
      // Fallback to general sweeper if no specific one exists
      const sweeper = await getRandomSweeper();
      return NextResponse.json({ asset: sweeper });
    }

    if (type === 'news-bed') {
      const bed = await getNewsBed();
      return NextResponse.json({ asset: bed });
    }

    if (type === 'traffic-ambience') {
      const sfx = await getTrafficAmbience();
      return NextResponse.json({ asset: sfx });
    }

    const catalog = await getR2AssetCatalog();
    return NextResponse.json({
      success: true,
      catalog,
    });
  } catch (error) {
    console.error('Radio assets endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch radio assets',
      },
      { status: 500 }
    );
  }
}
