import { NextResponse } from 'next/server';
import { fetchStructuredTomTomTraffic } from '@/lib/services/bulletin-service';

export async function GET() {
  try {
    const incidents = await fetchStructuredTomTomTraffic();
    return NextResponse.json({
      incidents,
      queriedAt: new Date().toISOString(),
      hasApiKey: !!process.env.TOMTOM_API_KEY,
    });
  } catch (error) {
    console.error('Traffic API error:', error);
    return NextResponse.json({
      incidents: [],
      queriedAt: new Date().toISOString(),
      hasApiKey: !!process.env.TOMTOM_API_KEY,
    });
  }
}
