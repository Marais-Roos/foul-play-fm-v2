import { NextRequest, NextResponse } from 'next/server';
import { stationBible, getCurrentShow, getShowById, getDJById, getSideCharacterById, getCallerByVoiceTag } from '@/lib/data/station';
import { generateHostQuip, generateSideCharacterQuip, generateSimonCarterTraffic, generateCallerSegment } from '@/lib/services/gemini';
import { synthesizeClonedSpeech } from '@/lib/services/fish-audio';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      characterId,
      showId,
      type = 'quip',
      callerId,
      topic,
      customText,
      currentTrackTitle,
    } = body;

    // 1. Identify Show & Speaker
    const show = showId ? getShowById(showId) || getCurrentShow() : getCurrentShow();
    let speakerName = '';
    let voiceId = '';
    let spokenText = '';
    let characterRole: 'host' | 'sidekick' | 'caller' = 'host';

    // Find requested character or default to current show's host
    const dj = characterId ? getDJById(characterId) : null;
    const sideChar = characterId ? getSideCharacterById(characterId) : null;
    const caller = callerId ? getCallerByVoiceTag(callerId) : null;

    if (sideChar) {
      speakerName = sideChar.name;
      voiceId = sideChar.fishAudioVoiceId || '';
      characterRole = 'sidekick';

      if (customText) {
        spokenText = customText;
      } else if (sideChar.id === 'simon-carter' || type === 'traffic') {
        const trafficReport = await generateSimonCarterTraffic(
          topic || 'Buccleuch interchange gridlocked due to a stationary flatbed carrying stolen municipal transformers'
        );
        spokenText = trafficReport.turns[0]?.text || sideChar.recommendedPreviewText;
      } else {
        const quip = await generateSideCharacterQuip(sideChar, topic);
        spokenText = quip.text;
      }
    } else if (dj) {
      speakerName = dj.name;
      voiceId = dj.fishAudioVoiceId || '';
      characterRole = 'host';

      if (customText) {
        spokenText = customText;
      } else {
        const quip = await generateHostQuip(dj, show, currentTrackTitle);
        spokenText = quip.text;
      }
    } else {
      // Default to current show host
      const hostId = show.hostIds[0];
      const host = getDJById(hostId) || stationBible.djs[0];
      speakerName = host.name;
      voiceId = host.fishAudioVoiceId || '';
      characterRole = 'host';

      if (type === 'caller' && caller) {
        const segment = await generateCallerSegment(show, host, caller, topic || 'Load shedding, potholes, and aliens');
        // Synthesize the host's reaction or caller line
        spokenText = segment.turns.map(t => `${t.speaker}: ${t.text}`).join(' ');
      } else if (customText) {
        spokenText = customText;
      } else {
        const quip = await generateHostQuip(host, show, currentTrackTitle);
        spokenText = quip.text;
      }
    }

    // Fallback voice ID if target character lacks one
    if (!voiceId) {
      voiceId = stationBible.djs[0].fishAudioVoiceId || '67c1ae8d7ee6462e986ec936d6ccbc98';
    }

    // 2. Synthesize with Fish Audio S2.1 Pro Free API
    let audioBuffer: Buffer;
    try {
      audioBuffer = await synthesizeClonedSpeech(spokenText, voiceId, {
        model: 's2.1-pro-free',
        format: 'mp3',
      });
    } catch (synthErr) {
      console.error('Fish Audio synthesis failed in route:', synthErr);
      return NextResponse.json(
        {
          success: false,
          error: synthErr instanceof Error ? synthErr.message : 'Voice synthesis failed',
          fallbackUrl: '/api/audio/voice?file=data/voices/main_presenters/tony_tatum_sample.mp3',
          speaker: speakerName,
          text: spokenText,
        },
        { status: 502 }
      );
    }

    const audioBase64 = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;
    const wordCount = spokenText.split(/\s+/).length;
    const durationSeconds = Math.max(2, Math.round(wordCount / 2.6));

    return NextResponse.json({
      success: true,
      speaker: speakerName,
      characterId: characterId || show.hostIds[0],
      role: characterRole,
      text: spokenText,
      audioBase64,
      durationSeconds,
    });
  } catch (error) {
    console.error('Radio quip generation route error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown generation error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const characterId = searchParams.get('characterId') || undefined;
  const customText = searchParams.get('text') || undefined;
  const type = (searchParams.get('type') as 'quip' | 'traffic') || 'quip';

  // Delegate to POST handler logic
  const mockPostReq = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ characterId, customText, type }),
  });

  const res = await POST(mockPostReq);
  const data = await res.json();

  if (!data.success || !data.audioBase64) {
    return new NextResponse('Synthesis failed', { status: 500 });
  }

  const base64Data = data.audioBase64.replace(/^data:audio\/mp3;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length.toString(),
      'X-Speaker': encodeURIComponent(data.speaker || ''),
      'X-Transcript': encodeURIComponent(data.text || ''),
    },
  });
}
