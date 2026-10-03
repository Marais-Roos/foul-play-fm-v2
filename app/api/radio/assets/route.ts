import { NextResponse } from 'next/server';
import { getR2AssetCatalog, getRandomAdvert, getRandomSweeper } from '@/lib/services/r2';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    if (type === 'random-ad') {
      const ad = await getRandomAdvert();
      return NextResponse.json({ asset: ad });
    }

    if (type === 'random-sweeper') {
      const sweeper = await getRandomSweeper();
      return NextResponse.json({ asset: sweeper });
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
