import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  stationBible,
  getCurrentShow,
  getShowById,
  getDJById,
  getSideCharacterById,
  getCallerByVoiceTag,
  fetchSanityShows,
  fetchSanityPresenters,
  fetchSanityCallers,
  KNOWN_CHARACTER_VOICE_IDS,
  resolveVoiceId,
  resolveSampleFile,
} from '@/lib/data/station';
import { DJ } from '@/lib/types/station';
import {
  generateHostQuip,
  generateSideCharacterQuip,
  generateSimonCarterTraffic,
  generateCallerSegment,
  generateShowBanterOrMonologue,
  generateTripleCallerSegment,
} from '@/lib/services/gemini';
import { synthesizeClonedSpeech } from '@/lib/services/fish-audio';
import { fetchTomTomGautengTraffic } from '@/lib/services/bulletin-service';

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

    // Load Sanity data with station-bible fallback
    const [sanityShows, sanityPresenters, sanityCallers] = await Promise.all([
      fetchSanityShows(),
      fetchSanityPresenters(),
      fetchSanityCallers(),
    ]);

    // 1. Identify Show (Sanity first)
    const show = (showId ? sanityShows.find(s => s.id === showId || s.id.includes(showId) || showId.includes(s.id)) : null) ||
                 (showId ? getShowById(showId) : null) ||
                 getCurrentShow();
    let speakerName = '';
    let spokenText = '';
    let characterRole: 'host' | 'sidekick' | 'caller' = 'host';
    let audioBuffer: Buffer;

    // 2. Identify Character routing (Sanity first)
    const dj = (characterId ? sanityPresenters.find(p => p.id === characterId || p.id.includes(characterId) || p.name.toLowerCase() === characterId.toLowerCase()) : null) ||
               (characterId ? getDJById(characterId) : null);
    const sideChar = characterId ? getSideCharacterById(characterId) : null;
    const caller = (callerId ? sanityCallers.find(c => c.voiceTag === callerId || c.id === callerId) : null) ||
                   (callerId ? getCallerByVoiceTag(callerId) : null);

    if (sideChar) {
      // Single side character trigger (e.g. Simon Carter, Dividend Dave)
      speakerName = sideChar.name;
      const voiceId = resolveVoiceId(sideChar, characterId);
      characterRole = 'sidekick';

      if (customText) {
        spokenText = customText;
      } else if (sideChar.id === 'simon-carter' || type === 'traffic') {
        let trafficContext = topic;
        if (!trafficContext) {
          const liveIncidents = await fetchTomTomGautengTraffic();
          if (liveIncidents.length > 0) {
            trafficContext = `LIVE TOMTOM HIGHWAY INCIDENTS:\n${liveIncidents.join('\n')}`;
          } else {
            trafficContext = 'Real-time telemetry monitors show all major corridors (N1, M1, R21, Buccleuch) running clear with no active incident delays reported on the grid.';
          }
        }
        const trafficReport = await generateSimonCarterTraffic(trafficContext);
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
      const voiceId = resolveVoiceId(dj, characterId);
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
      const host = sanityPresenters.find(p => p.id === hostId || p.id.includes(hostId)) ||
                   getDJById(hostId) ||
                   sanityPresenters[0] ||
                   stationBible.djs[0];
      speakerName = host.name;
      const voiceId = resolveVoiceId(host, hostId);
      characterRole = 'caller';

      const segment = await generateCallerSegment(show, host, caller, topic || 'Load shedding, potholes, and aliens');
      spokenText = segment.turns.map(t => `${t.speaker}: ${t.text}`).join(' ');

      audioBuffer = await synthesizeClonedSpeech(spokenText, voiceId, {
        model: 's2.1-pro-free',
        format: 'mp3',
      });
    } else if (mode === 'caller-block') {
      // 3-Caller Call-in Segment (Clock Step 13)
      characterRole = 'caller';
      const hostIds = show.hostIds || [];
      const hosts = hostIds
        .map((id) => sanityPresenters.find((p) => p.id === id || p.id.includes(id)) || getDJById(id))
        .filter((d): d is DJ => !!d);
      const effectiveHosts = hosts.length > 0 ? hosts : [sanityPresenters[0] || stationBible.djs[0]];

      // Curated allowed callers configured for THIS show in Sanity CMS
      const allowedShowCallers = (show.callers && show.callers.length > 0)
        ? show.callers
        : (sanityShows.find(s => s.id === show.id || s.title === show.title)?.callers || []);

      const effectiveCallers = (allowedShowCallers.length > 0)
        ? allowedShowCallers
        : sanityCallers;

      // Filter strictly for callers with active Fish Audio voice IDs
      const readyShowCallers = effectiveCallers.filter((c) => !!c.fishAudioVoiceId);
      const readyAllCallers = sanityCallers.filter((c) => !!c.fishAudioVoiceId);
      const eligibleCallers = readyShowCallers.length >= 3 ? readyShowCallers : readyAllCallers;

      const { turns, selectedCallers } = await generateTripleCallerSegment(
        show,
        effectiveHosts,
        eligibleCallers,
        topic
      );

      // Synthesize each turn with its character's cloned voice model in batches of 3
      const hostVoiceId = resolveVoiceId(effectiveHosts[0]);
      const turnBuffers: Buffer[] = [];
      const BATCH_SIZE = 3;
      for (let i = 0; i < turns.length; i += BATCH_SIZE) {
        const chunk = turns.slice(i, i + BATCH_SIZE);
        const chunkBuffers = await Promise.all(
          chunk.map(async (turn, chunkIdx) => {
            const globalIdx = i + chunkIdx;
            const callIdx = Math.min(2, Math.floor(globalIdx / 6));
            const isCaller = globalIdx % 2 === 1;
            const currentCaller = selectedCallers[callIdx] || selectedCallers[0];

            // Deterministic voice resolution: direct voiceId from turn -> current caller/host voice
            const voiceId =
              turn.voiceId ||
              (isCaller
                ? (currentCaller.fishAudioVoiceId || resolveVoiceId(currentCaller, currentCaller.voiceTag))
                : hostVoiceId);

            return synthesizeClonedSpeech(turn.text, voiceId, {
              model: 's2.1-pro-free',
              format: 'mp3',
            });
          })
        );
        turnBuffers.push(...chunkBuffers);
      }

      audioBuffer = Buffer.concat(turnBuffers);
      speakerName = `Live Callers (${selectedCallers.map((c) => c.archetype).join(', ')})`;
      spokenText = turns.map((t) => `${t.speaker}: ${t.text}`).join('\n');
    } else {
      // 3. Show-level trigger: Multi-host Banter or Solo Host Monologue
      characterRole = 'host';
      const hostIds = show.hostIds || [];
      const hosts = hostIds
        .map(id => sanityPresenters.find(p => p.id === id || p.id.includes(id)) || getDJById(id))
        .filter((d): d is DJ => !!d);
      const effectiveHosts = hosts.length > 0 ? hosts : [sanityPresenters[0] || stationBible.djs[0]];

      if (customText) {
        speakerName = effectiveHosts[0].name;
        spokenText = customText;
        const voiceId = resolveVoiceId(effectiveHosts[0]);
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
              const turnVoiceId = resolveVoiceId(speakerDJ, turn.speakerId) || resolveVoiceId(effectiveHosts[0]);
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
          const sampleRel = resolveSampleFile(effectiveHosts[0]);
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
