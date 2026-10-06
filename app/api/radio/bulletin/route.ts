import { NextRequest, NextResponse } from 'next/server';
import { buildFullHourlyBulletin, clearCachedBulletin } from '@/lib/services/bulletin-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';
    const showId = searchParams.get('showId') || undefined;

    const bulletin = await buildFullHourlyBulletin(refresh, showId);
    return NextResponse.json({
      success: true,
      bulletin,
    });
  } catch (err: any) {
    console.error('Hourly bulletin generation route failed:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to generate hourly bulletin',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  if (action === 'clear' || action === 'delete') {
    clearCachedBulletin();
    return NextResponse.json({
      success: true,
      message: 'Bulletin cache cleared',
    });
  }
  return GET(request);
}

export async function DELETE() {
  clearCachedBulletin();
  return NextResponse.json({
    success: true,
    message: 'Bulletin cache cleared',
  });
}
