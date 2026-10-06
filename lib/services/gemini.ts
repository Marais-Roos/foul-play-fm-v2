import { Show, DJ, SideCharacter, CallerPersona } from '../types/station';
import { getDJById, getSideCharacterById, resolveVoiceId } from '../data/station';
import {
  getRandomCallerLines,
  assignCallerIdentity,
  generateSingleCallFallback,
  detectCallerGender,
} from '../data/caller-identities';

export interface DialogueTurn {
  speaker: string;
  role: 'host' | 'caller' | 'sidekick';
  characterId: string;
  text: string;
  voiceId?: string;
}

export interface GeneratedScript {
  title: string;
  turns: DialogueTurn[];
  estimatedDurationSeconds: number;
}


/**
 * Low-level caller to Gemini REST API.
 */
async function callGemini(systemInstruction: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
  }

  // Use gemini-flash-latest with thinkingBudget 0 for instantaneous radio quips without token exhaustion
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      temperature: 0.95,
      maxOutputTokens: 2048,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  return candidate?.content?.parts?.[0]?.text || '';
}

/**
 * Sanitizes generated text for TTS synthesis: removes asterisks, brackets,
 * quotes, stage directions, speaker prefixes, and ensures terminal punctuation.
 */
export function sanitizeVoiceScript(text: string): string {
  if (!text) return '';
  let candidateText = text
    .replace(/^["'“](.*)["'”]$/g, '$1')
    .replace(/^[A-Za-z0-9\s"']+:[\s]*/, '') // Remove speaker prefixes like 'Tony:' or 'Tony "The Titan" Tatum:'
    .replace(/\*.*?\*/g, '')                // Remove *laughs*
    .replace(/\[.*?\]/g, '')                // Remove [applause]
    .replace(/\(.*?\)/g, '')                // Remove (chuckles)
    .trim();

  // Ensure sentence ends with complete terminal punctuation to prevent TTS clipping
  if (candidateText && !/[.!?]$/.test(candidateText)) {
    candidateText += '.';
  }

  return candidateText;
}

export interface ShowDialogueTurn {
  speakerId: string;
  speakerName: string;
  text: string;
}

export interface BanterContext {
  mode?: 'intro' | 'reaction' | 'mid-show' | 'quip';
  isFirstCycle?: boolean;
  songName?: string;
  artist?: string;
  nextSongName?: string;
  nextArtist?: string;
}

/**
 * Generates punchy back-and-forth banter for multi-host shows (or monologue for solo hosts),
 * tailored to show introductions (with next song tease), song reactions, or mid-show banter.
 */
export async function generateShowBanterOrMonologue(
  show: Show,
  hosts: DJ[],
  context?: BanterContext
): Promise<ShowDialogueTurn[]> {
  const isDialogue = hosts.length > 1;
  const mode = context?.mode || (context?.nextSongName ? 'intro' : context?.songName ? 'reaction' : 'mid-show');

  // Build mode-specific context descriptions and directives
  let contextDesc = '';
  let modeDirectives = '';

  if (mode === 'intro') {
    const nextStr = context?.nextSongName
      ? `'${context.nextSongName}'${context.nextArtist ? ` by '${context.nextArtist}'` : ''}`
      : 'the upcoming music selection';
    const isFirst = context?.isFirstCycle !== false;

    if (isFirst) {
      contextDesc = `SHOW OPENING & UPCOMING SONG INTRO:
Broadcasting on '${show.title}' (Vibe: ${show.vibe}). The show is kicking off fresh. The hosts are opening the show, establishing their chaotic dynamic, and must explicitly announce what song is playing next: ${nextStr}.`;
      modeDirectives = isDialogue
        ? `- Write a punchy back-and-forth banter (3-4 lines total) between the hosts.
- Open the show and introduce '${show.title}' on Foul Play FM.
- The hosts MUST explicitly say what the next song is (${nextStr}) with their signature flair.
- Embody their comedy styles and clashing egos.`
        : `- Write a punchy 1-2 sentence monologue introducing '${show.title}' on Foul Play FM.
- Explicitly announce what song is coming up next: ${nextStr}.`;
    } else {
      contextDesc = `MID-ROTATION SONG TEASE:
Broadcasting on '${show.title}' (Vibe: ${show.vibe}). The show is ALREADY well underway (this is NOT the start of the show). The hosts are doing a mid-show check-in and hyping up the next track: ${nextStr}.`;
      modeDirectives = isDialogue
        ? `- Write a punchy back-and-forth banter (3 lines total) between the hosts.
- DO NOT say 'welcome to the show' or 'kicking off the show' — the show is already in progress.
- Keep the banter rolling and explicitly announce what song is coming up next: ${nextStr}.
- Embody their comedy styles and clashing egos.`
        : `- Write a punchy 1-2 sentence monologue. Do NOT say welcome or kick off — the show is already underway.
- Explicitly announce what song is coming up next: ${nextStr}.`;
    }
  } else if (mode === 'reaction') {
    const prevStr = context?.songName
      ? `'${context.songName}'${context.artist ? ` by '${context.artist}'` : ''}`
      : 'the song that just played';
    contextDesc = `SONG OUTRO & REACTION:
The song ${prevStr} just finished playing on '${show.title}'.`;
    modeDirectives = isDialogue
      ? `- Write a short, punchy back-and-forth banter (3-4 lines total) between the hosts.
- The hosts must directly discuss or roast/praise the song that just finished (${prevStr}).
- Let their contrasting tastes, egos, and comedy styles clash.`
      : `- Write a short 1-2 sentence monologue reacting comically to the song that just finished: ${prevStr}.`;
  } else {
    // 'mid-show'
    contextDesc = `MID-SHOW STATION BANTER:
Broadcasting live on '${show.title}' (Vibe: ${show.vibe}).`;
    modeDirectives = isDialogue
      ? `- Write a short, punchy back-and-forth banter (strictly 3 lines total) between the hosts.
- Embody each host's distinct comedy style and voice. Let their clashing egos create the humor.`
      : `- Write a short, high-energy on-air monologue (1-2 sentences, max 30 words).
- Embody their specific voice, comedy style, and personality.`;
  }

  if (isDialogue) {
    const castList = hosts.map(h => 
      `- ${h.name} (${h.id}): Parody of ${h.parodyOf}. Personality: ${h.personality}`
    ).join('\n\n');

    const systemInstruction = `You are the showrunner and head writer for '${show.title}' on Foul Play FM.

THE CAST:
${castList}

CONTEXT:
${contextDesc}

DIRECTIVES:
${modeDirectives}
- DO NOT force arbitrary highway or location names. Focus on the characters' dynamic and the music.
- Output ONLY a valid JSON array of dialogue objects with this schema:
[
  {"speakerId": "${hosts[0].id}", "speakerName": "${hosts[0].name.split(' ')[0]}", "text": "..."},
  {"speakerId": "${hosts[1].id}", "speakerName": "${hosts[1].name.split(' ')[0]}", "text": "..."},
  {"speakerId": "${hosts[0].id}", "speakerName": "${hosts[0].name.split(' ')[0]}", "text": "..."}
]
No markdown code fences, no stage directions or asterisks in the text.`;

    try {
      const raw = await callGemini(systemInstruction, 'Action!');
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const turns: ShowDialogueTurn[] = JSON.parse(cleaned);
      if (Array.isArray(turns) && turns.length > 0) {
        return turns.map((t, idx) => {
          const matchingHost = hosts.find(h => 
            h.id === t.speakerId || 
            h.name.toLowerCase().includes((t.speakerName || '').toLowerCase()) ||
            (t.speakerName || '').toLowerCase().includes(h.name.split(' ')[0].toLowerCase())
          );
          const spk = matchingHost || hosts[idx % hosts.length];
          return {
            speakerId: spk.id,
            speakerName: spk.name.split(' ')[0],
            text: sanitizeVoiceScript(t.text),
          };
        });
      }
    } catch (e) {
      console.warn('Gemini banter generation failed, using lore fallback:', e);
    }

    // High quality character-driven fallback
    const nextSongTease = context?.nextSongName ? ` Up next: ${context.nextSongName}!` : '';
    return [
      {
        speakerId: hosts[0].id,
        speakerName: hosts[0].name.split(' ')[0],
        text: `You are locked to ${show.title} on Foul Play FM!${nextSongTease}`,
      },
      {
        speakerId: hosts[1].id,
        speakerName: hosts[1].name.split(' ')[0],
        text: `And remember, whatever happens next is entirely not our legal responsibility.`,
      },
      {
        speakerId: hosts[0].id,
        speakerName: hosts[0].name.split(' ')[0],
        text: `Turn it up and strap in!`,
      },
    ];
  }

  // Single host monologue
  const host = hosts[0];
  const systemInstruction = `You are the showrunner for '${show.title}' on Foul Play FM.

THE HOST:
${host.name} (${host.id}): Parody of ${host.parodyOf}.
Personality: ${host.personality}

CONTEXT:
${contextDesc}

DIRECTIVES:
${modeDirectives}
- DO NOT force arbitrary highway or location names. Focus on the character's ego, worldview, and quirks.
- Output ONLY a JSON array with this schema:
[
  {"speakerId": "${host.id}", "speakerName": "${host.name.split(' ')[0]}", "text": "..."}
]
No markdown code fences, no stage directions.`;

  try {
    const raw = await callGemini(systemInstruction, 'Action!');
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const turns: ShowDialogueTurn[] = JSON.parse(cleaned);
    if (Array.isArray(turns) && turns.length > 0) {
      return turns.map(t => ({
        speakerId: host.id,
        speakerName: host.name.split(' ')[0],
        text: sanitizeVoiceScript(t.text),
      }));
    }
  } catch (e) {
    console.warn('Gemini monologue generation failed, using fallback:', e);
  }

  const nextSongTease = context?.nextSongName ? ` Coming up next: ${context.nextSongName}!` : '';
  return [
    {
      speakerId: host.id,
      speakerName: host.name.split(' ')[0],
      text: `You're locked to ${show.title} on Foul Play FM!${nextSongTease}`,
    },
  ];
}

/**
 * Generates an unhinged on-air radio sweep / quip for a Show Host (DJ).
 */
export async function generateHostQuip(
  host: DJ,
  show?: Show,
  currentTrackTitle?: string
): Promise<{ text: string; speaker: string }> {
  const systemInstruction = `
You are writing on-air dialogue for Foul Play FM.
Character: ${host.name} (Parody of: ${host.parodyOf}).
Personality: ${host.personality}.
Show context: ${show ? `Show "${show.title}", vibe: ${show.vibe}` : 'On air live'}.

Instructions:
- Write ONE single fast punchy on-air radio one-liner or sweep (15 to 25 words max).
- Let the host's distinct personality, ego, and comedy shine.
- If a track title is provided, react to it naturally.
- DO NOT force arbitrary highway or location names.
- Do NOT include stage directions, asterisks, brackets, or speaker names.
- Output ONLY the spoken sentence.
`;

  const userPrompt = currentTrackTitle
    ? `You just played or are about to drop the track: "${currentTrackTitle}". Drop an unhinged 1-sentence DJ intro/sweep right now.`
    : `Drop an unhinged, high-energy 1-sentence on-air station identification or shock jock quip right now.`;

  try {
    const raw = await callGemini(systemInstruction, userPrompt);
    const cleaned = sanitizeVoiceScript(raw);
    return { text: cleaned, speaker: host.name };
  } catch (e) {
    console.warn('Gemini host quip failed, using lore fallback:', e);
    const fallbackQuips: Record<string, string> = {
      'tony-the-titan-tatum': 'Drop your lunch and brace yourselves—The Titan is suplexing your afternoon right now on Foul Play FM!',
      'benny-the-sloth-st-pierre': 'You are listening to Foul Play FM... or maybe you\'re not. Time is an illusion anyway.',
      'veronica-vee-vixen': 'Welcome to Foul Play FM, darlings, where your taste in music is almost as tragic as your outfit.',
      'cynthia-cyn-blight': 'The end times are already here, and they smell like burnt cheap cologne. Welcome to the show.',
      'captain-jeff-jeb-mcchad': 'Woo! Jeff McChad in the cockpit! Keep both hands on the wheel and your ego in the stratosphere!',
      'gary-the-guru-goldstein': 'Let me explain why your spiritual chakra is leaking tax-deductible anxiety right now.',
      'jodie-jinx-johnson': 'Switch off your brain and turn up the volume! Foul Play FM is pumping straight dopamine into your speakers!',
      'bambi-the-dazzler-mcqueen': 'Hey sweets, Bambi here! If you\'re still awake, just remember: your therapist went to sleep hours ago!',
      'chip-the-fearmonger-walton': 'Lock your deadbolts! They are monitoring your smart geysers right now on Foul Play FM!',
    };

    return {
      text: fallbackQuips[host.id] || `This is ${host.name} live on Foul Play FM!`,
      speaker: host.name,
    };
  }
}

/**
 * Generates an on-air guest quip for a Side Character.
 */
export async function generateSideCharacterQuip(
  character: SideCharacter,
  topic?: string
): Promise<{ text: string; speaker: string }> {
  const systemInstruction = `
You are writing dialogue for Foul Play FM, an unhinged satirical radio station in Gauteng, South Africa.
Character: ${character.name} (${character.role}).
Parody of: ${character.parodyOf}.
Personality: ${character.aiPersonalityPrompt}.
Voice tone: ${character.voiceDesignPrompt}.

Instructions:
- Write ONE single fast punchy broadcast statement (15 to 25 words max).
- Match the character's satirical specialty (finance grift, fake wellness, investigative paranoia, sports fury, municipal tender corruption).
- Do NOT include any stage directions or speaker prefixes.
- Output ONLY the spoken text.
`;

  const userPrompt = topic
    ? `Give a quick 1-sentence on-air take on: "${topic}".`
    : `Give a quick 1-sentence on-air take in your signature unhinged style.`;

  try {
    const raw = await callGemini(systemInstruction, userPrompt);
    const cleaned = sanitizeVoiceScript(raw);
    return { text: cleaned, speaker: character.name };
  } catch (e) {
    console.warn('Gemini side character quip failed, using fallback:', e);
    return {
      text: character.recommendedPreviewText || `This is ${character.name} for Foul Play FM. Stay alert, Gauteng.`,
      speaker: character.name,
    };
  }
}

/**
 * Generates Simon Carter's Maverick-style Traffic Chopper Report
 */
export async function generateSimonCarterTraffic(trafficContext: string): Promise<GeneratedScript> {
  const simon = getSideCharacterById('simon-carter')!;
  
  const systemInstruction = `
You are writing dialogue for Foul Play FM, a satirical radio station based in Gauteng, South Africa.
The style is inspired by Grand Theft Auto radio (unhinged, fast-paced, absurd).
Character: ${simon.name} (${simon.role}).
Parody of: ${simon.parodyOf}.
Bio: ${simon.description}.
Scriptwriter prompt: ${simon.aiPersonalityPrompt}.
Tone instructions: ${simon.voiceDesignPrompt}.
Target duration: 25-35 seconds of fast-paced broadcast dialogue. Do NOT include stage directions or sound effects in parentheses. Output ONLY the spoken lines.
`;

  const userPrompt = `
Give an on-air traffic update from your studio traffic desk watching live highway feeds across Gauteng.
Focus strictly on the primary highway arteries: R59, N1, N12, R24, R21, N3, N4, and M1.
NEVER reference local suburban backstreets, minor residential avenues, or irrelevant side roads.
BANNED JARGON: NEVER use sterile corporate buzzwords like "critical friction", "visuals confirm", "telemetry monitors", or "stationary congestion".

Here is the current live highway situation:
${trafficContext}

Reference real locations along these primary corridors (like Buccleuch, Gillooly's, Reading Interchange, Allandale, Double Decker, etc.). You are IN THE STUDIO (NOT IN A CHOPPER). Treat commuter traffic with breathless, manic, high-stakes Maverick urgency and raw, visceral emotion. If delays exist, call out the corridor and time with profane frustration. If nothing was found, treat the complete lack of feed intel with dramatic high-stakes panic. Conclude with "Back to the studio!"
`;

  try {
    const spokenText = await callGemini(systemInstruction, userPrompt);
    return {
      title: 'Simon Carter Traffic Desk Report',
      turns: [
        {
          speaker: simon.name,
          role: 'sidekick',
          characterId: simon.id,
          text: spokenText,
        },
      ],
      estimatedDurationSeconds: Math.ceil(spokenText.split(' ').length / 2.5),
    };
  } catch {
    // Realistic fallback based on real telemetry without fabricated incidents
    const fallbackText = trafficContext && trafficContext.includes(':')
      ? `Carter at the traffic desk! Telemetry screens flagging incidents on the grid: ${trafficContext}. Speeds are crawling in those zones, so keep your distance! Back to the studio!`
      : "Simon Carter at the traffic desk! I have got absolutely nothing on the feeds right now! Total blackout across the central grid—zero intel from Pretoria to the Vaal! You are flying completely blind out there, so check your six and watch your back! Back to the studio!";
    return {
      title: 'Simon Carter Traffic Desk Report',
      turns: [
        {
          speaker: simon.name,
          role: 'sidekick',
          characterId: simon.id,
          text: fallbackText,
        },
      ],
      estimatedDurationSeconds: 20,
    };
  }
}

/**
 * Generates an on-air caller phone-in segment between the Show Host(s) and a Caller Persona.
 * Supports both solo hosts and dual-host setups with strict persona separation.
 */
export async function generateCallerSegment(
  show: Show,
  hostOrHosts: DJ | DJ[],
  caller: CallerPersona,
  topic: string
): Promise<GeneratedScript> {
  const hosts = Array.isArray(hostOrHosts) ? hostOrHosts : [hostOrHosts];
  const isDuo = hosts.length > 1;
  const host0 = hosts[0];
  const host1 = isDuo ? hosts[1] : hosts[0];
  const h0Short = host0.name.split(' ')[0];
  const h1Short = host1.name.split(' ')[0];

  const hostDesc = isDuo
    ? `THE CO-HOSTS (STRICT PERSONALITY SEPARATION REQUIRED):
- Host 1: ${host0.name} (${host0.id}). Parody of ${host0.parodyOf}. Personality: ${host0.personality}.
  * CRITICAL DIRECTIVE: ${h0Short} MUST strictly speak in character as ${host0.parodyOf}. ${h0Short} must NEVER sound like a diva, never use gossip slangs, and never assume ${h1Short}'s persona.
- Host 2: ${host1.name} (${host1.id}). Parody of ${host1.parodyOf}. Personality: ${host1.personality}.
  * CRITICAL DIRECTIVE: ${h1Short} MUST strictly speak in character as ${host1.parodyOf}. ${h1Short} must NEVER use ${h0Short}'s mannerisms or style.`
    : `Host: ${host0.name} (${host0.id}) (${host0.parodyOf} parody). Personality: ${host0.personality}.`;

  const formatDesc = isDuo
    ? `Format: Generate 4 turns of dialogue (Turn 1: ${h0Short} picks up line and greets caller -> Turn 2: ${caller.archetype} makes absurd point -> Turn 3: ${h1Short} delivers sharp reaction / roast in their signature style -> Turn 4: ${h0Short} delivers punchline roast and cuts caller off).
Output JSON strictly with this schema:
[
  {"role": "host", "speaker": "${h0Short}", "characterId": "${host0.id}", "text": "..."},
  {"role": "caller", "speaker": "${caller.archetype}", "characterId": "${caller.voiceTag}", "text": "..."},
  {"role": "host", "speaker": "${h1Short}", "characterId": "${host1.id}", "text": "..."},
  {"role": "host", "speaker": "${h0Short}", "characterId": "${host0.id}", "text": "..."}
]`
    : `Format: Generate exactly 3 turns of dialogue (Turn 1: Host greets caller -> Turn 2: Caller makes absurd point -> Turn 3: Host reacts/roasts and cuts caller off).
Output JSON strictly with this schema:
[
  {"role": "host", "speaker": "${h0Short}", "characterId": "${host0.id}", "text": "..."},
  {"role": "caller", "speaker": "${caller.archetype}", "characterId": "${caller.voiceTag}", "text": "..."},
  {"role": "host", "speaker": "${h0Short}", "characterId": "${host0.id}", "text": "..."}
]`;

  const systemInstruction = `
You are writing a satirical phone-in radio call for Foul Play FM, set in Gauteng, South Africa.
Show: ${show.title} (Vibe: ${show.vibe}).
${hostDesc}

Caller: ${caller.archetype} (Satirizing: ${caller.targetOfSatire}, Gender: ${detectCallerGender(caller)}).
Caller Strategy: ${caller.aiContextStrategy}.
Caller Description: ${caller.description}.

${formatDesc}
Do NOT wrap in markdown ticks if possible, or use standard json. No stage directions in parentheses.
`;

  const userPrompt = `
The topic on air right now is: "${topic}".
The caller calls in to give their unhinged perspective. Make it authentically hilarious with South African references where appropriate.
`;

  try {
    const raw = await callGemini(systemInstruction, userPrompt);
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedTurns: Array<{ role: 'host' | 'caller'; speaker: string; characterId?: string; text: string }> = JSON.parse(cleaned);

    const turns: DialogueTurn[] = parsedTurns.map((t) => {
      const isCaller = t.role === 'caller';
      if (isCaller) {
        return {
          speaker: caller.archetype,
          role: 'caller' as const,
          characterId: caller.voiceTag,
          voiceId: caller.fishAudioVoiceId || resolveVoiceId(caller, caller.voiceTag),
          text: sanitizeVoiceScript(t.text),
        };
      }

      const matchingHost = hosts.find(
        (h) =>
          h.id === t.characterId ||
          h.name.toLowerCase().includes((t.speaker || '').toLowerCase()) ||
          (t.speaker || '').toLowerCase().includes(h.name.split(' ')[0].toLowerCase())
      ) || host0;

      return {
        speaker: matchingHost.name.split(' ')[0],
        role: 'host' as const,
        characterId: matchingHost.id,
        voiceId: matchingHost.fishAudioVoiceId || resolveVoiceId(matchingHost, matchingHost.id),
        text: sanitizeVoiceScript(t.text),
      };
    });

    return {
      title: `${caller.archetype} on ${show.title}`,
      turns,
      estimatedDurationSeconds: turns.reduce((acc, t) => acc + Math.ceil(t.text.split(' ').length / 2.5), 0),
    };
  } catch {
    // High quality offline fallback
    const turns: DialogueTurn[] = isDuo
      ? [
          {
            speaker: h0Short,
            role: 'host',
            characterId: host0.id,
            voiceId: host0.fishAudioVoiceId || resolveVoiceId(host0, host0.id),
            text: `Line 4, you're live on Foul Play FM with ${h0Short} and ${h1Short}. Make it quick!`,
          },
          {
            speaker: caller.archetype,
            role: 'caller',
            characterId: caller.voiceTag,
            voiceId: caller.fishAudioVoiceId || resolveVoiceId(caller, caller.voiceTag),
            text: caller.recommendedPreviewText,
          },
          {
            speaker: h1Short,
            role: 'host',
            characterId: host1.id,
            voiceId: host1.fishAudioVoiceId || resolveVoiceId(host1, host1.id),
            text: `Honey, please. That is the most unhinged take I have heard all day. Cut the line!`,
          },
          {
            speaker: h0Short,
            role: 'host',
            characterId: host0.id,
            voiceId: host0.fishAudioVoiceId || resolveVoiceId(host0, host0.id),
            text: `Line dumped. Don't call back. Back to the music.`,
          },
        ]
      : [
          {
            speaker: h0Short,
            role: 'host',
            characterId: host0.id,
            voiceId: host0.fishAudioVoiceId || resolveVoiceId(host0, host0.id),
            text: `Line 4, you're live on Foul Play FM. Make it quick, I don't have all day.`,
          },
          {
            speaker: caller.archetype,
            role: 'caller',
            characterId: caller.voiceTag,
            voiceId: caller.fishAudioVoiceId || resolveVoiceId(caller, caller.voiceTag),
            text: caller.recommendedPreviewText,
          },
          {
            speaker: h0Short,
            role: 'host',
            characterId: host0.id,
            voiceId: host0.fishAudioVoiceId || resolveVoiceId(host0, host0.id),
            text: `Unbelievable. Security, cut the line and send this caller a coupon for remedial education. Back to the music.`,
          },
        ];

    return {
      title: `${caller.archetype} on ${show.title} (Cached)`,
      turns,
      estimatedDurationSeconds: 22,
    };
  }
}

/**
 * Generates an unhinged 3-caller radio phone-in segment.
 * The host(s) take three calls, each with a 6-turn conversation (18 turns total).
 * Strictly maintains host identity separation in multi-host shows.
 */
export async function generateTripleCallerSegment(
  show: Show,
  hosts: DJ[],
  callers: CallerPersona[],
  topic?: string
): Promise<{ turns: DialogueTurn[]; selectedCallers: CallerPersona[] }> {
  // Select 3 callers strictly from the show's curated allowed callers list!
  // Prioritize allowed callers who have cloned Fish Audio voice IDs
  const readyCallers = callers.filter((c) => !!c.fishAudioVoiceId);
  const pool = readyCallers.length >= 3 ? readyCallers : (callers.length > 0 ? callers : readyCallers);
  const uniquePool = Array.from(new Map(pool.map((c) => [c.voiceTag, c])).values());
  const shuffled = [...uniquePool].sort(() => 0.5 - Math.random());
  const selectedCallers = shuffled.slice(0, Math.min(3, shuffled.length));
  while (selectedCallers.length < 3 && callers.length > 0) {
    const next = callers.find((c) => !selectedCallers.some((sc) => sc.voiceTag === c.voiceTag)) || callers[0];
    selectedCallers.push(next);
  }
  const [c1, c2, c3] = selectedCallers;

  // Station switchboard has 12 lines; randomly select 3 distinct lines (e.g. Line 7, Line 3, Line 11)
  const lines = getRandomCallerLines(3);
  const call1 = assignCallerIdentity(c1, lines[0]);
  const call2 = assignCallerIdentity(c2, lines[1]);
  const call3 = assignCallerIdentity(c3, lines[2]);
  const callIdentities = [call1, call2, call3];

  const isDuo = hosts.length > 1;
  const host0 = hosts[0];
  const host1 = isDuo ? hosts[1] : hosts[0];
  const h0Short = host0.name.split(' ')[0];
  const h1Short = host1.name.split(' ')[0];

  const hostGuidance = isDuo
    ? `THE CO-HOSTS (CRITICAL IDENTITY SEPARATION - DO NOT MIX PERSONAS):
Host A: ${host0.name} (${host0.id})
- Role: Lead Host on Call 1 & Call 3; Banter Interjector on Call 2
- Parody Of: ${host0.parodyOf}
- Personality & Style: ${host0.personality}
- CRITICAL RULE: ${h0Short} MUST strictly talk in their own voice and style (${host0.parodyOf}). ${h0Short} must NEVER sound like a diva, NEVER use gossip slang/phrases, and NEVER assume ${h1Short}'s persona!

Host B: ${host1.name} (${host1.id})
- Role: Lead Host on Call 2; Banter Interjector on Call 1 & Call 3
- Parody Of: ${host1.parodyOf}
- Personality & Style: ${host1.personality}
- CRITICAL RULE: ${h1Short} MUST strictly talk in their own voice and style (${host1.parodyOf}). ${h1Short} must NEVER use ${h0Short}'s mannerisms or style!`
    : `THE HOST:
${host0.name} (${host0.id})
- Parody Of: ${host0.parodyOf}
- Personality: ${host0.personality}`;

  const conversationStructure = isDuo
    ? `CONVERSATION STRUCTURE FOR DUAL HOSTS:
You must write 3 consecutive, back-to-back phone calls.
For EACH of the 3 calls, generate EXACTLY 6 turns of rapid-fire dialogue alternating Host -> Caller -> Host -> Caller -> Host -> Caller:

Call 1:
- Turn 1 (${h0Short}): Picks up Line ${call1.line} and introduces caller: "We've got ${call1.name} from ${call1.suburb} on line ${call1.line}, ${call1.name}... what's up?"
- Turn 2 (${call1.name}): Delivers absurd, unhinged grievance in their signature persona style.
- Turn 3 (${h1Short}): ${h1Short} chimes in with sharp disbelief, roasting, or mockery strictly in their own persona.
- Turn 4 (${call1.name}): Caller doubles down, yelling buzzwords or catchphrase.
- Turn 5 (${h0Short}): ${h0Short} delivers a ruthless punchline roast and cuts the line.
- Turn 6 (${call1.name}): Caller frantic parting shout cut off mid-sentence.

Call 2:
- Turn 7 (${h1Short}): Picks up Line ${call2.line} and introduces caller: "Line ${call2.line}, ${call2.name} from ${call2.suburb}, you're on with ${h1Short} and ${h0Short}. Talk to me."
- Turn 8 (${call2.name}): Delivers absurd, unhinged grievance in character.
- Turn 9 (${h0Short}): ${h0Short} chimes in with aggressive disbelief or mockery strictly in their own persona.
- Turn 10 (${call2.name}): Caller doubles down.
- Turn 11 (${h1Short}): ${h1Short} delivers a ruthless punchline roast and cuts the line.
- Turn 12 (${call2.name}): Caller frantic parting shout cut off mid-sentence.

Call 3:
- Turn 13 (${h0Short}): Picks up Line ${call3.line} and introduces caller: "Line ${call3.line}, ${call3.name} from ${call3.suburb}... what's your problem?"
- Turn 14 (${call3.name}): Delivers absurd, unhinged grievance in character.
- Turn 15 (${h1Short}): ${h1Short} chimes in mocking the caller.
- Turn 16 (${call3.name}): Caller doubles down or screams signature catchphrase.
- Turn 17 (${h0Short}): ${h0Short} delivers final ruthless roast and cuts switchboard line.
- Turn 18 (${call3.name}): Caller frantic parting shout cut off mid-sentence.`
    : `CONVERSATION STRUCTURE FOR SOLO HOST:
You must write 3 consecutive, back-to-back phone calls.
For EACH of the 3 calls, generate EXACTLY 6 turns alternating Host -> Caller -> Host -> Caller -> Host -> Caller:
- Turn 1 (Host): Picks up the assigned line and introduces caller by name, suburb, and line number in host's style.
- Turn 2 (Caller): Caller delivers absurd grievance in character.
- Turn 3 (Host): Host reacts with shock, mockery, or aggressive disbelief.
- Turn 4 (Caller): Caller doubles down with absurd logic or catchphrase.
- Turn 5 (Host): Host delivers ruthless comedic roast and cuts call.
- Turn 6 (Caller): Caller frantic parting shout cut off mid-sentence.`;

  const schemaExample = isDuo
    ? `OUTPUT STRICTLY AS A JSON ARRAY OF EXACTLY 18 OBJECTS:
[
  {"role": "host", "speaker": "${h0Short}", "characterId": "${host0.id}", "text": "We've got ${call1.name} from ${call1.suburb} on line ${call1.line}, ${call1.name}... what's up?"},
  {"role": "caller", "speaker": "${call1.name}", "characterId": "${c1.voiceTag}", "text": "..."},
  {"role": "host", "speaker": "${h1Short}", "characterId": "${host1.id}", "text": "..."},
  {"role": "caller", "speaker": "${call1.name}", "characterId": "${c1.voiceTag}", "text": "..."},
  {"role": "host", "speaker": "${h0Short}", "characterId": "${host0.id}", "text": "..."},
  {"role": "caller", "speaker": "${call1.name}", "characterId": "${c1.voiceTag}", "text": "..."}
]`
    : `OUTPUT STRICTLY AS A JSON ARRAY OF EXACTLY 18 OBJECTS:
[
  {"role": "host", "speaker": "${h0Short}", "characterId": "${host0.id}", "text": "We've got ${call1.name} from ${call1.suburb} on line ${call1.line}, ${call1.name}... what's up?"},
  {"role": "caller", "speaker": "${call1.name}", "characterId": "${c1.voiceTag}", "text": "..."},
  {"role": "host", "speaker": "${h0Short}", "characterId": "${host0.id}", "text": "..."},
  {"role": "caller", "speaker": "${call1.name}", "characterId": "${c1.voiceTag}", "text": "..."},
  {"role": "host", "speaker": "${h0Short}", "characterId": "${host0.id}", "text": "..."},
  {"role": "caller", "speaker": "${call1.name}", "characterId": "${c1.voiceTag}", "text": "..."}
]`;

  const topicText = topic || `The current on-air vibe on '${show.title}': ${show.vibe}. Unfiltered Gauteng listeners calling in to air absurd complaints and wild theories.`;

  const systemInstruction = `You are the lead comedy writer for '${show.title}' on Foul Play FM, a satirical radio station in Gauteng, South Africa inspired by GTA shock jock radio.

${hostGuidance}

THE 3 PHONE CALLS TO ANSWER:
Call 1:
- Telephone Line: Line ${call1.line}
- Caller Persona: ${c1.archetype} (${c1.voiceTag})
- Caller Character: ${call1.name} from ${call1.suburb} (Gender: ${detectCallerGender(c1)})
- Satirizing: ${c1.targetOfSatire}
- Context/Bio: ${c1.aiContextStrategy} ${c1.description}

Call 2:
- Telephone Line: Line ${call2.line}
- Caller Persona: ${c2.archetype} (${c2.voiceTag})
- Caller Character: ${call2.name} from ${call2.suburb} (Gender: ${detectCallerGender(c2)})
- Satirizing: ${c2.targetOfSatire}
- Context/Bio: ${c2.aiContextStrategy} ${c2.description}

Call 3:
- Telephone Line: Line ${call3.line}
- Caller Persona: ${c3.archetype} (${c3.voiceTag})
- Caller Character: ${call3.name} from ${call3.suburb} (Gender: ${detectCallerGender(c3)})
- Satirizing: ${c3.targetOfSatire}
- Context/Bio: ${c3.aiContextStrategy} ${c3.description}

${conversationStructure}

Total: EXACTLY 18 turns (3 calls x 6 turns = 18 turns).
Keep each line short, punchy (1-2 sentences, max 20 words per line).
Keep the pacing fast, aggressive, and hilarious. Authentic South African cultural touches (Woolies, Sandton, load shedding, bakkie, braai) are encouraged where appropriate.
DO NOT include markdown code fences, stage directions, or sound effects in parentheses.

${schemaExample}
`;

  try {
    const raw = await callGemini(systemInstruction, `The topic is: "${topicText}". Write the 3 phone calls now.`);
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed: Array<{ role: 'host' | 'caller'; speaker: string; characterId: string; text: string }> = JSON.parse(cleaned);

    if (Array.isArray(parsed) && parsed.length >= 6) {
      const turns: DialogueTurn[] = parsed.slice(0, 18).map((t, idx) => {
        const callIdx = Math.min(2, Math.floor(idx / 6));
        const turnInCall = idx % 6;
        const isCaller = turnInCall % 2 === 1; // Odd turns (1, 3, 5) are Caller
        const currentCaller = selectedCallers[callIdx] || selectedCallers[0];
        const currentIdentity = callIdentities[callIdx];

        if (isCaller) {
          return {
            role: 'caller' as const,
            speaker: `${currentIdentity.name} (${currentCaller.archetype})`,
            characterId: currentCaller.voiceTag,
            voiceId: currentCaller.fishAudioVoiceId || resolveVoiceId(currentCaller, currentCaller.voiceTag),
            text: sanitizeVoiceScript(t.text),
          };
        }

        // Host turn: resolve which host is speaking
        let turnHost = host0;
        if (isDuo) {
          const matchingHost = hosts.find((h) =>
            h.id === t.characterId ||
            h.name.toLowerCase().includes((t.speaker || '').toLowerCase()) ||
            (t.speaker || '').toLowerCase().includes(h.name.split(' ')[0].toLowerCase())
          );

          if (matchingHost) {
            turnHost = matchingHost;
          } else {
            // Predictable alternation if Gemini didn't specify matching host
            // Call 1 & 3: host0 leads (turn 0, 4), host1 interjects (turn 2)
            // Call 2: host1 leads (turn 0, 4), host0 interjects (turn 2)
            if (callIdx === 1) {
              turnHost = turnInCall === 2 ? host0 : host1;
            } else {
              turnHost = turnInCall === 2 ? host1 : host0;
            }
          }
        }

        return {
          role: 'host' as const,
          speaker: turnHost.name.split(' ')[0],
          characterId: turnHost.id,
          voiceId: turnHost.fishAudioVoiceId || resolveVoiceId(turnHost, turnHost.id),
          text: sanitizeVoiceScript(t.text),
        };
      });

      if (turns.length === 18) {
        return { turns, selectedCallers };
      }
    }
  } catch (err) {
    console.warn('Gemini 3-caller generation failed, using lore fallback:', err);
  }

  // High quality offline fallback with exactly 3 calls x 6 turns = 18 turns
  const fallbackTurns: DialogueTurn[] = isDuo
    ? [
        ...generateSingleCallFallback(host0, callIdentities[0], host1, host0),
        ...generateSingleCallFallback(host1, callIdentities[1], host0, host1),
        ...generateSingleCallFallback(host0, callIdentities[2], host1, host0),
      ]
    : [
        ...generateSingleCallFallback(host0, callIdentities[0]),
        ...generateSingleCallFallback(host0, callIdentities[1]),
        ...generateSingleCallFallback(host0, callIdentities[2]),
      ];

  return { turns: fallbackTurns, selectedCallers };
}

/**
 * Generates an on-air reaction for the show host(s) immediately following the hourly news bulletin.
 * Rules:
 * 1. Sarcastically thank the news crew.
 * 2. Either mock Gavin Stone (news guy) for being a fucking nerd / spreadsheet geek / doom monger,
 *    OR mock Simon Carter (traffic guy) for being a wannabe pilot / screeching in a helicopter / thinking he's Top Gun in a lawnmower.
 * 3. Hosts are fine with the sports anchor Gary Miller (they don't like Gavin or Simon, but Gary is fine).
 * 4. Strictly embody the hosts' personas, comedy styles, and contrasting dynamics.
 * 5. Multi-host shows have 2-3 punchy lines of banter; solo hosts have a 1-2 sentence monologue.
 */
export async function generatePostBulletinReaction(
  show: Show,
  hosts: DJ[]
): Promise<ShowDialogueTurn[]> {
  const isDialogue = hosts.length > 1;

  const castList = hosts
    .map((h) => `- ${h.name} (${h.id}): Parody of ${h.parodyOf}. Personality: ${h.personality}`)
    .join('\n\n');

  const systemInstruction = `You are the showrunner and head writer for '${show.title}' on Foul Play FM (Vibe: ${show.vibe}).

THE CAST:
${castList}

SETTING:
The top-of-the-hour broadcast bulletin just concluded on Foul Play FM:
1. Gavin Stone (News & Weather): Paranoid, Tucker Carlson-style doom-monger whining about state corruption, crime, and temperatures.
2. Gary Miller (Sport): Grumpy Roy Keane-style hardass complaining about pampered athletes.
3. Simon Carter (Traffic Desk / Chopper 1): Screaming into a headset over helicopter noise, panicking about highway traffic jams like a wannabe fighter pilot flying combat missions in a toy helicopter.

COMEDY RULES FOR THE POST-NEWS HOST REACTION:
1. SARCASTIC THANKS: Sarcastically thank the news crew for their "uplifting" or "stressful" broadcast.
2. MOCK GAVIN OR SIMON (OR BOTH):
   - Either roast Gavin Stone for being an insufferable, spreadsheet-hugging, paranoid nerd / dork / buzzkill.
   - OR roast Simon Carter for being a pathetic wannabe pilot / Top Gun cosplayer / screaming in a two-seater lawnmower / thinking he's Maverick hovering over traffic.
3. FINE WITH GARY MILLER: None of the hosts like the news guy (Gavin) or the traffic guy (Simon), but they are fine with the sports anchor (Gary) (e.g. "Miller's all right though", "At least Gary tells it like it is", "Miller gets it").
4. STRICT CHARACTER PERSONA: Embody each host's exact comedic voice, ego, and mannerisms.
${
  isDialogue
    ? `5. DIALOGUE FORMAT: Write a fast, punchy back-and-forth banter (strictly 2 to 3 lines total) between the hosts.
Output ONLY a valid JSON array of objects:
[
  {"speakerId": "${hosts[0].id}", "speakerName": "${hosts[0].name.split(' ')[0]}", "text": "..."},
  {"speakerId": "${hosts[1].id}", "speakerName": "${hosts[1].name.split(' ')[0]}", "text": "..."}
]`
    : `5. MONOLOGUE FORMAT: Write a punchy 1-2 sentence monologue (max 35 words).
Output ONLY a valid JSON array of objects:
[
  {"speakerId": "${hosts[0].id}", "speakerName": "${hosts[0].name.split(' ')[0]}", "text": "..."}
]`
}
No markdown code fences, no stage directions, no asterisks in the text.`;

  try {
    const raw = await callGemini(systemInstruction, 'Action!');
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const turns: ShowDialogueTurn[] = JSON.parse(cleaned);
    if (Array.isArray(turns) && turns.length > 0) {
      return turns.map((t, idx) => {
        const matchingHost = hosts.find(
          (h) =>
            h.id === t.speakerId ||
            h.name.toLowerCase().includes((t.speakerName || '').toLowerCase()) ||
            (t.speakerName || '').toLowerCase().includes(h.name.split(' ')[0].toLowerCase())
        );
        const spk = matchingHost || hosts[idx % hosts.length];
        return {
          speakerId: spk.id,
          speakerName: spk.name.split(' ')[0],
          text: sanitizeVoiceScript(t.text),
        };
      });
    }
  } catch (err) {
    console.warn('Gemini post-bulletin reaction generation failed, using lore fallback:', err);
  }

  // Lore-accurate character fallbacks
  const h0 = hosts[0];
  const h0Short = h0.name.split(' ')[0];

  if (isDialogue) {
    const h1 = hosts[1];
    const h1Short = h1.name.split(' ')[0];

    // Show-specific multi-host fallbacks
    if (show.id.includes('midday') || (h0.id.includes('tony') && h1.id.includes('benny'))) {
      return [
        {
          speakerId: h0.id,
          speakerName: h0Short,
          text: 'Huge thanks to our news crew. Gavin, put the spreadsheet down and hit the bench press, you absolute nerd! And Simon, stop screaming like you are in Top Gun, you are hovering over a minibus taxi! Miller is cool though.',
        },
        {
          speakerId: h1.id,
          speakerName: h1Short,
          text: 'Yeah... my ears are literally ringing from that helicopter. Let us just play some actual music before Simon crashes into a billboard.',
        },
      ];
    }

    if (show.id.includes('rush-hour') || (h0.id.includes('veronica') && h1.id.includes('cynthia'))) {
      return [
        {
          speakerId: h0.id,
          speakerName: h0Short,
          text: 'Thanks boys! Gavin, sweetie, you have the sexual magnetism of a broken calculator. And Simon, honey, nobody thinks you are Tom Cruise in that rental whirlybird.',
        },
        {
          speakerId: h1.id,
          speakerName: h1Short,
          text: 'Literally insufferable. At least Gary Miller hates everyone as much as I do. Back to normal programming before Gavin starts crying about potholes again.',
        },
      ];
    }

    return [
      {
        speakerId: h0.id,
        speakerName: h0Short,
        text: `Thanks to the news crew. Gavin is an insufferable nerd and Simon thinks he is flying fighter jets over Midrand. Gary Miller is the only one with half a brain.`,
      },
      {
        speakerId: h1.id,
        speakerName: h1Short,
        text: `Amen to that. Let us get back to the music before Simon screeches in our ears again.`,
      },
    ];
  }

  // Solo host fallbacks
  const soloFallbacks: Record<string, string> = {
    'chip-the-fearmonger-walton':
      'Thanks to Gavin the data nerd for reciting government-approved panic scripts, and Simon for buzzing around like a lunatic mosquito in that surveillance chopper! Gary has the right idea. Back to the music!',
    'captain-jeff-jeb-mcchad':
      'Thanks boys. Gavin, you spreadsheet nerd, go eat some elk meat! And Carter, you are not Maverick, you are looking at minivans on the N1 in a lawnmower! Gary is all right though. Back to the tunes!',
    'gary-the-guru-goldstein':
      'Thanks news desk. Gavin is trapped in a low-vibration spreadsheet illusion, and Carter is disturbing the cosmic frequency with that toy helicopter. Miller is cool though. Let us flow back to the sound.',
    'jodie-jinx-johnson':
      'Thanks for the news, boys. Gavin, you adorable little nerd, go get some fresh air. And Simon, please stop screaming at traffic like you are flying a stealth bomber. Back to the playlist!',
    'bambi-the-dazzler-mcqueen':
      'Ugh, thanks boys! Gavin, sweetie, you are such an exhausting nerd. And Simon, stop buzzing that cheap helicopter over my hair! Miller is a sweetheart though. Back to the music!',
  };

  const text =
    soloFallbacks[h0.id] ||
    soloFallbacks[h0.id.replace(/-the-.*?-/, '-')] ||
    `Thanks to the news crew. Gavin, stop being such a fucking nerd, and Simon, you are not a fighter pilot. Gary Miller gets it though. Let us get right back into the music!`;

  return [
    {
      speakerId: h0.id,
      speakerName: h0Short,
      text: sanitizeVoiceScript(text),
    },
  ];
}


