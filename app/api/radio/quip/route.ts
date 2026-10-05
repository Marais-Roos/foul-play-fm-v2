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

const KNOWN_CHARACTER_VOICE_IDS: Record<string, string> = {
  'chip-walton': 'd527402573e240b0b031d17aad89ef89',
  'chip-the-fearmonger-walton': 'd527402573e240b0b031d17aad89ef89',
  'tony-tatum': '67c1ae8d7ee6462e986ec936d6ccbc98',
  'tony-the-titan-tatum': '67c1ae8d7ee6462e986ec936d6ccbc98',
  'benny-st-pierre': 'f587effe905b4d4ab22c805b16b85087',
  'benny-the-sloth-st-pierre': 'f587effe905b4d4ab22c805b16b85087',
  'veronica-vixen': 'efe8f141c12b4830883e9aec05f9391f',
  'veronica-vee-vixen': 'efe8f141c12b4830883e9aec05f9391f',
  'cynthia-blight': '916bb3d02cf94c14ade432c585753d1e',
  'cynthia-cyn-blight': '916bb3d02cf94c14ade432c585753d1e',
  'captain-jeff-mcchad': 'fa76d3a10b504ba3bb908a85c034bd0c',
  'captain-jeff-jeb-mcchad': 'fa76d3a10b504ba3bb908a85c034bd0c',
  'gary-goldstein': 'e9dd99c678bd44ceaea247426995874f',
  'gary-the-guru-goldstein': 'e9dd99c678bd44ceaea247426995874f',
  'jodie-johnson': 'ae91061816cd4b57a07f357b8043b793',
  'jodie-jinx-johnson': 'ae91061816cd4b57a07f357b8043b793',
  'bambi-mcqueen': 'de762b532db1447e8b59ce858737ae66',
  'bambi-the-dazzler-mcqueen': 'de762b532db1447e8b59ce858737ae66',
  'marcus-miles': '20d2b982c2c1418d85b388769230164f',
  'dividend-dave': '52d9d7520ae94ecaa4cb23b6b8e1692d',
  'serena-bloom': '8de847a878a74fb3a58fdecd60c9ec42',
  'gavin-stone': '5754add8d0bc461ca5497455c23d5459',
  'gary-miller': 'db6b76e124d640ef92f2b27db5c1a2c2',
  'simon-carter': '70bf5611864f4f668074c5578d8b2cce',
  'warrant-officer-van-der-merwe': 'c208b9a1a2d94f689f508c937ea15fcb',
  // Caller Personas
  'the_simp': '9059006ba98e46679d6c1854e0e561ef',
  'the-simp': '9059006ba98e46679d6c1854e0e561ef',
  'the_manager': '917394e15de04cffb83327d10992eaad',
  'the-manager': '917394e15de04cffb83327d10992eaad',
  'the_fanboy': '4aea3663e5d84299be737d2fc0f7d126',
  'the-fanboy': '4aea3663e5d84299be737d2fc0f7d126',
  'the_grind': '4453b57ac87545569a8f14223eb0fdfc',
  'the-grind': '4453b57ac87545569a8f14223eb0fdfc',
  'the_victim': 'cb244062cfb94f22b2004ce28a7535d0',
  'the-victim': 'cb244062cfb94f22b2004ce28a7535d0',
  'the_lawyer': '0364ff7b11fc4f6995c12c0d90d6b0af',
  'the-lawyer': '0364ff7b11fc4f6995c12c0d90d6b0af',
  'the_boomer': '36da76a2d78c45c1a53ce728c0031694',
  'the-boomer': '36da76a2d78c45c1a53ce728c0031694',
  'the_scroller': '363691f2153547ef969b35a51981540d',
  'the-scroller': '363691f2153547ef969b35a51981540d',
  'the_hun': '87da595f029b414b8067b7926d5ffc17',
  'the-hun': '87da595f029b414b8067b7926d5ffc17',
  'the_npc': '557cf772eb4c407ca4ffdc87ee98e2d4',
  'the-npc': '557cf772eb4c407ca4ffdc87ee98e2d4',
  'the_expat': '9a68fb49bc09405592e3098ad3d3bb94',
  'the-expat': '9a68fb49bc09405592e3098ad3d3bb94',
  'the_snob': '3328cd5341144675a8ab4ea2dbc22d00',
  'the-snob': '3328cd5341144675a8ab4ea2dbc22d00',
  'the_uncle': '1f3f108d511a4faab4a8279746fe160c',
  'the-uncle': '1f3f108d511a4faab4a8279746fe160c',
  'the_crackhead': '9b91bcfdf2964977a401ff5457d1158a',
  'the-crackhead': '9b91bcfdf2964977a401ff5457d1158a',
  'the_divorcee': '3a71547ac7144875b625ac4f77a06c71',
  'the-divorcee': '3a71547ac7144875b625ac4f77a06c71',
  'the_zef': 'cb8e84c3c0c8466aa2b104c806bb0f97',
  'the-zef': 'cb8e84c3c0c8466aa2b104c806bb0f97',
  'the_og': '582b4d986ba84c1cba20d7413d34b442',
  'the-og': '582b4d986ba84c1cba20d7413d34b442',
  'the_spaza': '4f834d7aefe54ba98d8cd295b4589e2e',
  'the-spaza': '4f834d7aefe54ba98d8cd295b4589e2e',
};

function resolveVoiceId(character?: { id?: string; slug?: string; name?: string; fishAudioVoiceId?: string | null } | null, fallbackId?: string): string {
  if (character?.fishAudioVoiceId) return character.fishAudioVoiceId;
  const id = character?.id || character?.slug || fallbackId || '';
  const clean = id.toLowerCase().trim();
  if (KNOWN_CHARACTER_VOICE_IDS[clean]) return KNOWN_CHARACTER_VOICE_IDS[clean];
  for (const [key, vId] of Object.entries(KNOWN_CHARACTER_VOICE_IDS)) {
    if (clean && (key.includes(clean) || clean.includes(key))) {
      return vId;
    }
  }
  const nameClean = (character?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [key, vId] of Object.entries(KNOWN_CHARACTER_VOICE_IDS)) {
    const keyClean = key.replace(/[^a-z0-9]/g, '');
    if (nameClean && (keyClean.includes(nameClean) || nameClean.includes(keyClean))) {
      return vId;
    }
  }
  return '67c1ae8d7ee6462e986ec936d6ccbc98';
}

function resolveSampleFile(character?: { id?: string; slug?: string; name?: string; voiceSampleFile?: string } | null, fallbackId?: string): string {
  if (character?.voiceSampleFile) return character.voiceSampleFile;
  const id = character?.id || character?.slug || character?.name || fallbackId || '';
  const clean = id.toLowerCase().trim();
  const fileMap: Record<string, string> = {
    'chip': 'data/voices/main_presenters/chip_walton_sample.mp3',
    'tony': 'data/voices/main_presenters/tony_tatum_sample.mp3',
    'benny': 'data/voices/main_presenters/benny_st_pierre_sample.mp3',
    'veronica': 'data/voices/main_presenters/veronica_vixen_sample.mp3',
    'cynthia': 'data/voices/main_presenters/cynthia_blight_sample.mp3',
    'capt': 'data/voices/main_presenters/capt_jeff_mcchad_sample.mp3',
    'jeff': 'data/voices/main_presenters/capt_jeff_mcchad_sample.mp3',
    'gary': 'data/voices/main_presenters/gary_goldstein_sample.mp3',
    'jodie': 'data/voices/main_presenters/jodie_johnson_sample.mp3',
    'bambi': 'data/voices/main_presenters/bambi_mcqueen_sample.mp3',
  };
  for (const [key, path] of Object.entries(fileMap)) {
    if (clean.includes(key)) return path;
  }
  return 'data/voices/main_presenters/tony_tatum_sample.mp3';
}

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

      const { turns, selectedCallers } = await generateTripleCallerSegment(
        show,
        effectiveHosts,
        sanityCallers,
        topic
      );

      // Map callers by voice tag and id for robust lookup
      const callerMap = new Map<string, (typeof sanityCallers)[0]>();
      sanityCallers.forEach((c) => {
        callerMap.set(c.voiceTag.toLowerCase(), c);
        callerMap.set(c.id.toLowerCase(), c);
      });

      // Synthesize each turn with its character's cloned voice model in batches of 3
      const turnBuffers: Buffer[] = [];
      const BATCH_SIZE = 3;
      for (let i = 0; i < turns.length; i += BATCH_SIZE) {
        const chunk = turns.slice(i, i + BATCH_SIZE);
        const chunkBuffers = await Promise.all(
          chunk.map(async (turn) => {
            let voiceId: string;
            if (turn.role === 'caller') {
              const matchingCaller =
                callerMap.get(turn.characterId.toLowerCase()) ||
                selectedCallers.find(
                  (c) =>
                    c.voiceTag.toLowerCase() === turn.characterId.toLowerCase() ||
                    c.archetype.toLowerCase() === turn.speaker.toLowerCase()
                );
              voiceId = resolveVoiceId(matchingCaller, turn.characterId);
            } else {
              const speakerDJ =
                effectiveHosts.find(
                  (h) => h.id === turn.characterId || h.name.toLowerCase().includes(turn.speaker.toLowerCase())
                ) || effectiveHosts[0];
              voiceId = resolveVoiceId(speakerDJ, turn.characterId);
            }

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
