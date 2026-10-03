import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const range = request.headers.get('range');
    const fetchHeaders: Record<string, string> = {};
    if (range) {
      fetchHeaders['Range'] = range;
    }

    const res = await fetch(url, { headers: fetchHeaders });
    if (!res.ok && res.status !== 206) {
      return new NextResponse(`Upstream error: ${res.status}`, { status: res.status });
    }

    const headers = new Headers();
    headers.set('Content-Type', res.headers.get('content-type') || 'audio/mpeg');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Accept-Ranges', 'bytes');
    const contentLength = res.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    const contentRange = res.headers.get('content-range');
    if (contentRange) {
      headers.set('Content-Range', contentRange);
    }

    return new NextResponse(res.body, {
      status: res.status,
      headers,
    });
  } catch (error) {
    console.error('Asset stream proxy error:', error);
    return new NextResponse('Stream proxy failed', { status: 500 });
  }
}
