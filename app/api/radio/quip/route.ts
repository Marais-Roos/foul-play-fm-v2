import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { stationBible, getCurrentShow, getShowById, getDJById, getSideCharacterById, getCallerByVoiceTag } from '@/lib/data/station';
import { DJ } from '@/lib/types/station';
import {
  generateHostQuip,
  generateSideCharacterQuip,
  generateSimonCarterTraffic,
  generateCallerSegment,
  generateShowBanterOrMonologue,
} from '@/lib/services/gemini';
import { synthesizeClonedSpeech } from '@/lib/services/fish-audio';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      characterId,
      showId,
      type = 'quip',
      mode,
      callerId,
      topic,
      customText,
      currentTrackTitle,
      songName,
      artist,
      nextSongName,
      nextArtist,
      isFirstCycle,
    } = body;

    // 1. Identify Show
    const show = showId ? getShowById(showId) || getCurrentShow() : getCurrentShow();
    let speakerName = '';
    let spokenText = '';
    let characterRole: 'host' | 'sidekick' | 'caller' = 'host';
    let audioBuffer: Buffer;

    // 2. Identify Character routing
    const dj = characterId ? getDJById(characterId) : null;
    const sideChar = characterId ? getSideCharacterById(characterId) : null;
    const caller = callerId ? getCallerByVoiceTag(callerId) : null;

    if (sideChar) {
      // Single side character trigger (e.g. Simon Carter, Dividend Dave)
      speakerName = sideChar.name;
      const voiceId = sideChar.fishAudioVoiceId || '67c1ae8d7ee6462e986ec936d6ccbc98';
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

      audioBuffer = await synthesizeClonedSpeech(spokenText, voiceId, {
        model: 's2.1-pro-free',
        format: 'mp3',
      });
    } else if (dj) {
      // Single DJ trigger (e.g. from Presenters page card)
      speakerName = dj.name;
      const voiceId = dj.fishAudioVoiceId || '67c1ae8d7ee6462e986ec936d6ccbc98';
      characterRole = 'host';

      if (customText) {
        spokenText = customText;
      } else {
        const trackContext = currentTrackTitle || (songName ? `${songName}${artist ? ` by ${artist}` : ''}` : undefined);
        const quip = await generateHostQuip(dj, show, trackContext);
        spokenText = quip.text;
      }

      audioBuffer = await synthesizeClonedSpeech(spokenText, voiceId, {
        model: 's2.1-pro-free',
        format: 'mp3',
      });
    } else if (type === 'caller' && caller) {
      // Caller segment
      const hostId = show.hostIds[0];
      const host = getDJById(hostId) || stationBible.djs[0];
      speakerName = host.name;
      const voiceId = host.fishAudioVoiceId || '67c1ae8d7ee6462e986ec936d6ccbc98';
      characterRole = 'caller';

      const segment = await generateCallerSegment(show, host, caller, topic || 'Load shedding, potholes, and aliens');
      spokenText = segment.turns.map(t => `${t.speaker}: ${t.text}`).join(' ');

      audioBuffer = await synthesizeClonedSpeech(spokenText, voiceId, {
        model: 's2.1-pro-free',
        format: 'mp3',
      });
    } else {
      // 3. Show-level trigger: Multi-host Banter or Solo Host Monologue
      characterRole = 'host';
      const hostIds = show.hostIds || [];
      const hosts = hostIds.map(id => getDJById(id)).filter((d): d is DJ => !!d);
      const effectiveHosts = hosts.length > 0 ? hosts : [stationBible.djs[0]];

      if (customText) {
        speakerName = effectiveHosts[0].name;
        spokenText = customText;
        const voiceId = effectiveHosts[0].fishAudioVoiceId || '67c1ae8d7ee6462e986ec936d6ccbc98';
        audioBuffer = await synthesizeClonedSpeech(spokenText, voiceId, {
          model: 's2.1-pro-free',
          format: 'mp3',
        });
      } else {
        // Derive song and flow context
        const songCtx = {
          mode: mode as any,
          isFirstCycle: typeof isFirstCycle === 'boolean' ? isFirstCycle : undefined,
          songName: songName || (currentTrackTitle ? currentTrackTitle.split(' - ')[0]?.split(' by ')[0]?.trim() : undefined),
          artist: artist || (currentTrackTitle ? (currentTrackTitle.split(' - ')[1] || currentTrackTitle.split(' by ')[1])?.trim() : undefined),
          nextSongName,
          nextArtist,
        };

        const turns = await generateShowBanterOrMonologue(show, effectiveHosts, songCtx);

        // Synthesize each turn concurrently with its presenter's cloned voice model
        try {
          const turnBuffers = await Promise.all(
            turns.map(async (turn) => {
              const speakerDJ = getDJById(turn.speakerId) || effectiveHosts.find(h => h.id === turn.speakerId) || effectiveHosts[0];
              const turnVoiceId = speakerDJ?.fishAudioVoiceId || effectiveHosts[0].fishAudioVoiceId || '67c1ae8d7ee6462e986ec936d6ccbc98';
              return synthesizeClonedSpeech(turn.text, turnVoiceId, {
                model: 's2.1-pro-free',
                format: 'mp3',
              });
            })
          );

          // Concatenate audio buffers seamlessly
          audioBuffer = Buffer.concat(turnBuffers);
        } catch (synthErr) {
          console.warn('Fish Audio live synthesis timed out or failed, using local presenter sample fallback:', synthErr);
          const sampleRel = effectiveHosts[0]?.voiceSampleFile || 'data/voices/main_presenters/tony_tatum_sample.mp3';
          const samplePath = path.join(process.cwd(), sampleRel);
          if (fs.existsSync(samplePath)) {
            audioBuffer = fs.readFileSync(samplePath);
          } else {
            throw synthErr;
          }
        }

        const isMultiTurn = turns.length > 1;
        speakerName = isMultiTurn
          ? effectiveHosts.map(h => h.name.split(' ')[0]).join(' & ')
          : (turns[0]?.speakerName || effectiveHosts[0].name);

        spokenText = isMultiTurn
          ? turns.map(t => `${t.speakerName}: "${t.text}"`).join('\n')
          : (turns[0]?.text || '');
      }
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
        fallbackUrl: '/api/audio/voice?file=data/voices/main_presenters/tony_tatum_sample.mp3',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const characterId = searchParams.get('characterId') || undefined;
  const showId = searchParams.get('showId') || undefined;
  const customText = searchParams.get('text') || undefined;
  const type = (searchParams.get('type') as 'quip' | 'traffic') || 'quip';
  const songName = searchParams.get('songName') || undefined;
  const artist = searchParams.get('artist') || undefined;

  // Delegate to POST handler logic
  const mockPostReq = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ characterId, showId, customText, type, songName, artist }),
  });

  const res = await POST(mockPostReq);
  const data = await res.json();

  if (!data.success || !data.audioBase64) {
    return new NextResponse('Synthesis failed: ' + (data.error || 'Unknown error'), { status: 500 });
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
