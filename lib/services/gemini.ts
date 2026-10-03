import { Show, DJ, SideCharacter, CallerPersona } from '../types/station';
import { getDJById, getSideCharacterById } from '../data/station';

export interface DialogueTurn {
  speaker: string;
  role: 'host' | 'caller' | 'sidekick';
  characterId: string;
  text: string;
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

  // Use gemini-3.5-flash
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

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
      maxOutputTokens: 600,
    }
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
  const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return candidateText.trim();
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
You are writing dialogue for Foul Play FM, a satirical radio station set in Gauteng, South Africa.
The vibe is Grand Theft Auto radio (unhinged, fast-talking, cynical, absurd South African satire).
Character: ${host.name} (Parody of: ${host.parodyOf}).
Personality: ${host.personality}.
Bio: ${host.description}.
Show context: ${show ? `Show "${show.title}", vibe: ${show.vibe}` : 'On air live in Gauteng'}.

Instructions:
- Write ONE single fast punchy on-air radio one-liner or sweep (15 to 25 words max).
- Refer to Gauteng locations (Pretoria, Joburg, Sandton, Centurion, Ben Schoeman N1, Brits, Vaal) or topical SA madness when relevant.
- Do NOT include any stage directions, asterisks, brackets, or speaker names.
- Output ONLY the spoken sentence.
`;

  const userPrompt = currentTrackTitle
    ? `You just played or are about to drop the track: "${currentTrackTitle}". Drop an unhinged 1-sentence DJ intro/sweep for Foul Play FM right now.`
    : `Drop an unhinged, high-energy 1-sentence on-air station identification or shock jock quip for Foul Play FM right now.`;

  try {
    const raw = await callGemini(systemInstruction, userPrompt);
    const cleaned = raw.replace(/^["']|["']$/g, '').trim();
    return { text: cleaned, speaker: host.name };
  } catch (e) {
    console.warn('Gemini host quip failed, using lore fallback:', e);
    const fallbackQuips: Record<string, string> = {
      'tony-tatum': 'Gauteng, drop your lunch and brace yourselves—The Titan is suplexing your afternoon right now on Foul Play FM!',
      'benny-st-pierre': 'You are listening to Foul Play FM... or maybe you\'re not. Time is an illusion invented by Sandton estate agents.',
      'veronica-vixen': 'Welcome to Foul Play FM, darlings, where your net worth is laughable and your outfit is an environmental disaster.',
      'cynthia-blight': 'Pretoria, the end times are already here, and they smell like burnt clutch on the Buccleuch interchange.',
      'capt-jeff-mcchad': 'Woo! Jeff McChad in the cockpit! Keep both hands on the wheel and your ego in the stratosphere!',
      'gary-goldstein': 'Shalom Gauteng, let me explain why your spiritual chakra is leaking tax-deductible anxiety right now.',
      'jodie-johnson': 'Switch off your brain and turn up the volume! Foul Play FM is pumping straight dopamine into your dashboard!',
      'bambi-mcqueen': 'Hey sweets, Bambi here! If you\'re stuck on the N1, just remember: your therapist is stuck three cars behind you!',
      'chip-walton': 'Lock your deadbolts, Pretoria! They are monitoring your smart geysers right now on Foul Play FM!',
    };

    return {
      text: fallbackQuips[host.id] || `This is ${host.name} live on Foul Play FM, Gauteng's most dangerous radio station!`,
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
    const cleaned = raw.replace(/^["']|["']$/g, '').trim();
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
Give an on-air traffic update from your attack helicopter flying over Gauteng.
Here is the current live highway situation:
${trafficContext}

Reference real locations like the Buccleuch interchange, N1, M1, or R21. Treat commuter traffic like an aerial combat dogfight. Keep it punchy and hysterical.
`;

  try {
    const spokenText = await callGemini(systemInstruction, userPrompt);
    return {
      title: 'Chopper Maverick Traffic Report',
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
    // Offline satirical fallback
    const fallbackText = "Tower, this is Maverick in Chopper One over the Buccleuch interchange! We have a complete lock-on! Commuters are boxed in from all vectors, four lanes of stationary Toyota Corollas with zero escape velocity! Over on the M1 South, a flatbed carrying secondhand scrap copper has deployed a defensive smoke screen! If you're heading toward Sandton, eject! I repeat, eject into the nearest drainage ditch! Back to the studio!";
    return {
      title: 'Chopper Maverick Traffic Report (Cached)',
      turns: [
        {
          speaker: simon.name,
          role: 'sidekick',
          characterId: simon.id,
          text: fallbackText,
        },
      ],
      estimatedDurationSeconds: 28,
    };
  }
}

/**
 * Generates an on-air caller phone-in segment between the Show Host and a Caller Persona.
 */
export async function generateCallerSegment(
  show: Show,
  host: DJ,
  caller: CallerPersona,
  topic: string
): Promise<GeneratedScript> {
  const systemInstruction = `
You are writing a satirical phone-in radio call for Foul Play FM, set in Gauteng, South Africa.
Show: ${show.title} (Vibe: ${show.vibe}).
Host: ${host.name} (${host.parodyOf} parody).
Host Personality: ${host.personality}.

Caller: ${caller.archetype} (Satirizing: ${caller.targetOfSatire}).
Caller Strategy: ${caller.aiContextStrategy}.
Caller Description: ${caller.description}.

Format: Generate exactly 3 to 4 turns of dialogue (Host greets caller -> Caller makes absurd point -> Host reacts/roasts -> Host cuts them off).
Output JSON strictly with this schema:
[
  {"role": "host", "speaker": "${host.name}", "text": "..."},
  {"role": "caller", "speaker": "${caller.archetype}", "text": "..."},
  {"role": "host", "speaker": "${host.name}", "text": "..."}
]
Do NOT wrap in markdown ticks if possible, or use standard json. No stage directions in parentheses.
`;

  const userPrompt = `
The topic on air right now is: "${topic}".
The caller calls in to give their unhinged perspective. Make it authentically hilarious with South African references where appropriate.
`;

  try {
    const raw = await callGemini(systemInstruction, userPrompt);
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedTurns: Array<{ role: 'host' | 'caller'; speaker: string; text: string }> = JSON.parse(cleaned);

    const turns: DialogueTurn[] = parsedTurns.map(t => ({
      speaker: t.speaker,
      role: t.role,
      characterId: t.role === 'host' ? host.id : caller.id,
      text: t.text,
    }));

    return {
      title: `${caller.archetype} on ${show.title}`,
      turns,
      estimatedDurationSeconds: turns.reduce((acc, t) => acc + Math.ceil(t.text.split(' ').length / 2.5), 0),
    };
  } catch {
    // High quality offline fallback
    const turns: DialogueTurn[] = [
      {
        speaker: host.name,
        role: 'host',
        characterId: host.id,
        text: `Line 4, you're live on Foul Play FM. Make it quick, I don't have all day.`,
      },
      {
        speaker: caller.archetype,
        role: 'caller',
        characterId: caller.id,
        text: caller.recommendedPreviewText,
      },
      {
        speaker: host.name,
        role: 'host',
        characterId: host.id,
        text: `Unbelievable. Security, cut the line and send this man a coupon for remedial education. Back to the music.`,
      },
    ];

    return {
      title: `${caller.archetype} on ${show.title} (Cached)`,
      turns,
      estimatedDurationSeconds: 22,
    };
  }
}
