import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');

  if (!file) {
    return new NextResponse('Missing file parameter', { status: 400 });
  }

  // Extract only the relative subpath within data/voices
  const cleanSubPath = file.replace(/^data\/voices\//, '').replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(process.cwd(), 'data', 'voices', cleanSubPath);

  if (!fs.existsSync(filePath)) {
    return new NextResponse('File not found', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const mimeType = filePath.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';

  const range = request.headers.get('range');
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    // @ts-expect-error Node stream to Web ReadableStream
    return new NextResponse(fileStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': mimeType,
      },
    });
  }

  const fileStream = fs.createReadStream(filePath);
  // @ts-expect-error Node stream to Web ReadableStream
  return new NextResponse(fileStream, {
    headers: {
      'Content-Length': fileSize.toString(),
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    },
  });
}
