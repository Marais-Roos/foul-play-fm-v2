import { NextRequest, NextResponse } from 'next/server';
import { buildFullHourlyBulletin } from '@/lib/services/bulletin-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    const bulletin = await buildFullHourlyBulletin(refresh);
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
  return GET(request);
}
