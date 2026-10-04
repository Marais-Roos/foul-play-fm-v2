import { sanitizeVoiceScript } from './gemini';
import { synthesizeClonedSpeech } from './fish-audio';

export interface BulletinTurn {
  anchorId: 'gavin-stone' | 'gary-miller' | 'simon-carter';
  anchorName: string;
  segment: 'News & Weather' | 'Sport' | 'Traffic Desk';
  voiceId: string;
  text: string;
  audioBase64?: string;
  durationSeconds?: number;
}

export interface HourlyBulletin {
  id: string;
  createdAt: string;
  introSweeperUrl?: string;
  outroSweeperUrl?: string;
  newsBedUrl?: string;
  helicopterUrl?: string;
  turns: BulletinTurn[];
  totalDurationSeconds: number;
}

const ANCHOR_VOICES: Record<string, { name: string; segment: 'News & Weather' | 'Sport' | 'Traffic Desk'; voiceId: string }> = {
  'gavin-stone': {
    name: 'Gavin Stone',
    segment: 'News & Weather',
    voiceId: '5754add8d0bc461ca5497455c23d5459',
  },
  'gary-miller': {
    name: 'Gary Miller',
    segment: 'Sport',
    voiceId: 'db6b76e124d640ef92f2b27db5c1a2c2',
  },
  'simon-carter': {
    name: 'Simon Carter',
    segment: 'Traffic Desk',
    voiceId: '70bf5611864f4f668074c5578d8b2cce',
  },
};

// In-memory cache for 5 minutes
let cachedBulletin: HourlyBulletin | null = null;
let lastGeneratedAt = 0;
const BULLETIN_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * 1. Fetch real South African News headlines from NewsAPI
 */
export async function fetchSouthAfricaNews(): Promise<string[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    // Priority: Quality SA publications (EWN, TimesLIVE, Daily Maverick, IOL)
    const url = `https://newsapi.org/v2/everything?domains=dailymaverick.co.za,timeslive.co.za,iol.co.za,ewn.co.za&pageSize=4&apiKey=${apiKey}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FoulPlayFM/2.0' },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.articles) && data.articles.length > 0) {
        return data.articles.map((a: any) => a.title).filter(Boolean);
      }
    }

    // Secondary fallback: General SA search
    const query = encodeURIComponent(`"South Africa" AND (economy OR police OR parliament OR Eskom OR minister OR president)`);
    const fallbackRes = await fetch(`https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&language=en&pageSize=4&apiKey=${apiKey}`, {
      headers: { 'User-Agent': 'FoulPlayFM/2.0' },
      next: { revalidate: 300 },
    });
    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json();
      if (Array.isArray(fbData.articles) && fbData.articles.length > 0) {
        return fbData.articles.map((a: any) => a.title).filter(Boolean);
      }
    }
  } catch (err) {
    console.warn('NewsAPI SA fetch failed:', err);
  }

  return [];
}

/**
 * 2. Fetch Targeted Sports News (Rugby, Football, Cricket - zero American sports)
 */
export async function fetchTargetedSportsNews(): Promise<string[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const q = encodeURIComponent(`Springboks OR "Vodacom Bulls" OR "Premier League" OR "Manchester United" OR Proteas OR "Currie Cup" OR "Champions League" OR "FC Barcelona" OR URC`);
    const url = `https://newsapi.org/v2/everything?q=${q}&sortBy=publishedAt&language=en&pageSize=4&apiKey=${apiKey}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FoulPlayFM/2.0' },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.articles) && data.articles.length > 0) {
        return data.articles.map((a: any) => a.title).filter(Boolean);
      }
    }
  } catch (err) {
    console.warn('NewsAPI Sports fetch failed:', err);
  }

  return [];
}

/**
 * 3. Fetch Genuine Real-Time Gauteng Regional Weather (Johannesburg, Pretoria, East Rand, Vaal)
 */
interface WeatherLocation {
  name: string;
  lat: number;
  lon: number;
}

const GAUTENG_WEATHER_REGIONS: WeatherLocation[] = [
  { name: 'Johannesburg', lat: -26.2041, lon: 28.0473 },
  { name: 'Pretoria', lat: -25.7479, lon: 28.2293 },
  { name: 'East Rand', lat: -26.1386, lon: 28.2432 },
  { name: 'Vaal', lat: -26.6731, lon: 27.9262 },
];

function interpretWmoCode(code: number): string {
  if (code === 0) return 'clear skies';
  if (code <= 3) return 'partly cloudy with Highveld haze';
  if (code === 45 || code === 48) return 'heavy smog and morning mist';
  if (code >= 51 && code <= 55) return 'drizzle on slick tarmac';
  if (code >= 61 && code <= 65) return 'steady rain';
  if (code >= 80 && code <= 82) return 'afternoon rain showers';
  if (code >= 95) return 'severe electrical storm with hail';
  return 'variable Highveld skies';
}

export async function fetchGautengWeather(): Promise<string> {
  try {
    const results = await Promise.all(
      GAUTENG_WEATHER_REGIONS.map(async (region) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${region.lat}&longitude=${region.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Africa%2FJohannesburg`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'FoulPlayFM/2.0' },
          next: { revalidate: 300 },
        });
        if (!res.ok) throw new Error(`Open-Meteo ${region.name} failed with ${res.status}`);
        const data = await res.json();
        const temp = Math.round(data.current?.temperature_2m ?? 20);
        const feels = Math.round(data.current?.apparent_temperature ?? temp);
        const code = data.current?.weather_code ?? 0;
        const wind = Math.round(data.current?.wind_speed_10m ?? 10);
        const condition = interpretWmoCode(code);
        const feelsStr = feels !== temp ? `, feels like ${feels}°C` : '';
        return `${region.name}: ${temp}°C (${condition}${feelsStr}, winds ${wind}km/h)`;
      })
    );

    return results.join(' | ');
  } catch (err) {
    console.warn('Real-time weather fetch failed, using fallback:', err);
  }

  return 'Johannesburg: 20°C (clear skies) | Pretoria: 24°C (hot and sunny) | East Rand: 19°C (partly cloudy) | Vaal: 18°C (chemical haze)';
}

export interface TrafficIncidentItem {
  id: string;
  road: string;
  description: string;
  from?: string;
  to?: string;
  delayMinutes: number;
}

const TARGET_HIGHWAY_CORRIDORS = [
  'N1', 'N3', 'N4', 'N12', 'N14',
  'M1', 'M2', 'M5',
  'R21', 'R24', 'R59', 'R55', 'R511'
];

function identifyHighwayCorridor(props: any): string | null {
  const roadNumbers: string[] = (props.roadNumbers || []).map((r: string) => r.toUpperCase().trim());

  // 1. Check explicit road number arrays
  for (const target of TARGET_HIGHWAY_CORRIDORS) {
    if (
      roadNumbers.some(
        (rn) =>
          rn === target ||
          rn.startsWith(`${target}/`) ||
          rn.endsWith(`/${target}`) ||
          rn.includes(` ${target} `)
      )
    ) {
      return target;
    }
  }

  // 2. Check from, to, and event description with word boundaries
  const eventsDesc = (props.events || []).map((e: any) => e.description || '').join(' ');
  const text = `${props.from || ''} ${props.to || ''} ${eventsDesc}`.toUpperCase();

  for (const target of TARGET_HIGHWAY_CORRIDORS) {
    const regex = new RegExp(`(?:\\b|\\()${target}(?:\\b|\\))`, 'i');
    if (regex.test(text)) {
      return target;
    }
  }

  // 3. Key known highway interchanges and expressways
  if (text.includes('BUCCLEUCH')) return 'N1/N3 (Buccleuch)';
  if (text.includes('GILLOOLY')) return 'N3/R24 (Gilloolys)';
  if (text.includes('READING INTERCHANGE')) return 'N12/R59 (Reading)';
  if (text.includes('DOUBLE DECKER')) return 'M1 (Double Decker)';
  if (text.includes('ALLANDALE')) return 'N1 (Allandale)';
  if (text.includes('CORLETT')) return 'M1 (Corlett)';
  if (text.includes('CROWN INTERCHANGE')) return 'M1/M2 (Crown)';
  if (text.includes('WILLIAM NICOL') || text.includes('WINNIE MANDELA')) return 'R511 (Winnie Mandela)';
  if (text.includes('BEYERS NAUDE')) return 'M5 (Beyers Naude)';

  return null;
}

/**
 * 4. Fetch Structured Live TomTom Gauteng Traffic Incidents (Primary Arteries Only)
 * Filters strictly for active major highway arteries, completely discarding
 * residential backstreets, cul-de-sacs, and zero-delay suburban closures.
 */
export async function fetchStructuredTomTomTraffic(): Promise<TrafficIncidentItem[]> {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) return [];

  try {
    const fields =
      '{incidents{type,properties{id,iconCategory,magnitudeOfDelay,events{description,code},from,to,length,delay,roadNumbers}}}';
    // Bbox covering Gauteng highway grid: Vaal (south) to Pretoria/Brits (north), Krugersdorp (west) to Springs (east)
    const bbox = '27.7,-26.6,28.4,-25.65';
    // categoryFilter: 1 (Accidents), 6 (Traffic Jams), 7 (Lane Closures), 9 (Road Works), 14 (Breakdowns)
    // Note: Exclude category 8 (closed roads) at the API level unless on major highways to avoid hundreds of 50m residential cul-de-sac closures
    const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=${bbox}&fields=${encodeURIComponent(
      fields
    )}&categoryFilter=1,6,7,9,14&timeValidityFilter=present&language=en-GB&key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      const raw = data.incidents || [];

      const matched: TrafficIncidentItem[] = [];

      for (const i of raw) {
        const props = i.properties || {};

        // Ignore minor suburban events without recorded delay unless an explicit incident exists
        const delaySec = props.delay || 0;
        const lengthM = props.length || 0;

        // Discard short (<300m) incidents with no delay
        if (delaySec === 0 && lengthM < 300) continue;

        const corridor = identifyHighwayCorridor(props);
        // Strictly ignore suburban / local backstreets
        if (!corridor) continue;

        const mins = Math.round(delaySec / 60);
        const desc = props.events?.[0]?.description || 'Congestion / slow traffic';
        const from = props.from;
        const to = props.to;

        matched.push({
          id: props.id || `incident-${matched.length}`,
          road: corridor,
          description: desc,
          from,
          to,
          delayMinutes: mins,
        });
      }

      // Sort by delay descending (worst delays first)
      matched.sort((a, b) => b.delayMinutes - a.delayMinutes);

      return matched.slice(0, 6);
    }
  } catch (err) {
    console.warn('TomTom traffic fetch failed:', err);
  }

  return [];
}

/**
 * Fetch Live TomTom Gauteng Traffic Incidents as formatted strings
 */
export async function fetchTomTomGautengTraffic(): Promise<string[]> {
  const items = await fetchStructuredTomTomTraffic();
  return items.map((i) => {
    const route = i.from && i.to ? ` between ${i.from} and ${i.to}` : '';
    const delay = i.delayMinutes > 0 ? ` (${i.delayMinutes} min delay)` : '';
    return `${i.road}: ${i.description}${route}${delay}`;
  });
}

/**
 * 5. Generate Bulletin Script turns using Gemini
 */
export async function generateHourlyBulletinScript(): Promise<BulletinTurn[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const [saNews, sports, weather, traffic] = await Promise.all([
    fetchSouthAfricaNews(),
    fetchTargetedSportsNews(),
    fetchGautengWeather(),
    fetchTomTomGautengTraffic(),
  ]);

  const systemInstruction = `You are the unhinged, foul-mouthed executive broadcast director for Foul Play FM, South Africa.
Generate the top-of-the-hour broadcast bulletin featuring three distinct anchors in succession.

CRITICAL EDITORIAL STYLE RULES:
1. 100% FACTUAL, ZERO DELUSION: All reporting MUST be factually accurate based on the ingested live data. Do NOT invent fake conspiracies or hallucinate fake news. The facts must be real, but the commentary must be feral, cynical, and brutally unhinged.
2. AGGRESSIVELY ERRATIC & SPOKEN: NEVER sound like a teleprompter, an essay, or a BBC documentary. NEVER write formal book English like "Let us examine", "Weather-wise", or "I am". Use natural spoken contractions ("I'm", "don't", "it's", "they've", "ain't"). Use punchy sentence fragments, visceral outbursts, rhetorical disgust, and erratic pacing.
3. PROFANE & VISCERAL: The anchors are deeply cynical, angry South Africans tired of government failure, incompetent management, and crumbling infrastructure. Let them swear naturally and aggressively (bullshit, fuck, bloody, absolute kak, circus, clowns, thieves, useless bastards).
4. SOUTH AFRICAN FLAVOUR: Natural local references and cadence where appropriate (Eskom clowns, potholes, tenders, braai, load shedding, Vaal, Sandton, Gautrain).
5. STRICTLY NO AMERICAN SPORTS: Focus purely on Rugby (Springboks/URC), Football (Premier League/Champions League), and Cricket (Proteas).

THE ANCHORS:
1. GAVIN STONE (News & Weather):
   - Style: Tucker Carlson meets an angry, paranoid South African libertarian. Rapid-fire rhetorical questions, biting sarcasm, complete disbelief at state incompetence.
   - Flow: Tears into the lead crime/corruption/Eskom headlines with bitter ridicule, barks the real temperatures for Joburg and Pretoria, and throws sport aggressively to Gary Miller.
   - Tone Example: "Top of the hour on Foul Play FM. Look at this circus. Half a billion rand—poof! Gone! A former minister in cuffs, and what, we're supposed to give the police a fucking medal for doing their jobs five years late? Khayelitsha's a war zone, Eskom's crying about Koeberg again, and in the CBD we've still got a gaping crater in the tarmac because City Power can't hire a contractor without five cousins taking a cut. Joburg's sitting at eighteen degrees, Pretoria's twenty. The sun's out, the country's in the bin. Miller, talk some sense before I lose my mind."

2. GARY MILLER (Sport):
   - Style: Roy Keane with zero patience. Grumpy, brutal, aggressive disgust at pampered millionaires and soft athletes.
   - Flow: Destroys the sports headlines. Mocks whining managers, choke-artist national teams, and excuses.
   - Tone Example: "Give me a fucking break, Gavin. Ten Hag's crying about a soft penalty while his fifty-million-pound midfield can't complete a five-yard pass to a bloke wearing the same coloured shirt. Do your job! And the Proteas—God give me strength. Cruising, cruising, and then seven wickets gone in twenty minutes like a bunch of schoolboys scared of the ball. Absolute embarrassment. Carter, tell me the highways aren't as pathetic as these athletes."

3. SIMON CARTER (Chopper 1 Traffic):
   - Style: High-caffeinated, screaming, panic-stricken traffic reporter hovering directly over Gauteng in Chopper 1. Fighting rotor wash, turbulence, and G-forces over Buccleuch Interchange, shouting into a headset microphone over the helicopter engine noise.
   - Flow: Treats Gauteng traffic like an active aerial war zone. Full adrenaline, swearing at terrible drivers and highway gridlock below him, naming specific corridors, delays, and ramps. Ends with a breathless sign-off ("Back to the studio!").
   - Tone Example: "Gary, are you blind from down there?! The entire grid is a catastrophe from up here in Chopper 1! Look at the N1 North! Buccleuch is an absolute fucking car park right now—twenty minutes dead standstill because somebody couldn't figure out how to merge! And the Double Decker on the M1? Forget it! Shut your engine off, light a cigarette, you live on the highway now! Eastbound R24 is crawling into OR Tambo, delays stacking up by the minute. Stay off the highways, take the back streets, and don't make eye contact! Back to the studio!"

Output STRICT JSON schema:
[
  {"anchorId": "gavin-stone", "anchorName": "Gavin Stone", "segment": "News & Weather", "text": "..."},
  {"anchorId": "gary-miller", "anchorName": "Gary Miller", "segment": "Sport", "text": "..."},
  {"anchorId": "simon-carter", "anchorName": "Simon Carter", "segment": "Traffic Desk", "text": "..."}
]
No markdown fences, no stage directions, no asterisks.`;

  const userPrompt = `Live Ingested Data for this bulletin:
SA HEADLINES: ${saNews.length > 0 ? saNews.join("; ") : "No live headlines available"}
SPORTS HEADLINES: ${sports.length > 0 ? sports.join("; ") : "No live sports headlines available"}
WEATHER: ${weather}
GAUTENG TRAFFIC: ${traffic.length > 0 ? traffic.join("; ") : "Nothing found - zero incident data or camera feeds detected on the wire"}

Write the full top-of-the-hour bulletin now.`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.95,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
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
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini Bulletin Generation Error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

  let turns: any[] = [];
  try {
    turns = JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Gemini bulletin JSON, using fallback:', rawText);
    turns = [
      {
        anchorId: 'gavin-stone',
        anchorName: 'Gavin Stone',
        segment: 'News & Weather',
        text: `Welp, fuck all is happening right now, or my useless producer couldn't find shit on the wires. It's Gauteng, the state is still totally useless, and everything is on fire. Gary, talk some shit before I lose my mind.`,
      },
      {
        anchorId: 'gary-miller',
        anchorName: 'Gary Miller',
        segment: 'Sport',
        text: `What am I supposed to say, Gavin? A bunch of overpaid twats kicked a ball into the grass and cried about their hamstrings. Fuck 'em all. Over to Carter before I punch this microphone.`,
      },
      {
        anchorId: 'simon-carter',
        anchorName: 'Simon Carter',
        segment: 'Traffic Desk',
        text: traffic && traffic.length > 0
          ? `Gary, look at this fucking mess on the screens right now! ${traffic.join('. ')}. Stop driving like complete maniacs, watch your distance, and get off the grid! Back to the studio!`
          : `Gary, look at the monitors right now! I have got jack shit on the feeds! Total blackout across the central grid! Zero intel from Pretoria all the way to the Vaal—not a single confirmed crash or pile-up! You are driving completely blind out there, so eyes open, stay sharp, and watch your six! Back to the studio!`,
      },
    ];
  }

  return turns.map((t) => ({
    anchorId: t.anchorId,
    anchorName: t.anchorName,
    segment: t.segment,
    voiceId: ANCHOR_VOICES[t.anchorId]?.voiceId || '5754add8d0bc461ca5497455c23d5459',
    text: sanitizeVoiceScript(t.text),
  }));
}

/**
 * 6. Synthesize audio for each bulletin turn with Fish Audio
 */
export async function buildFullHourlyBulletin(forceRefresh: boolean = false): Promise<HourlyBulletin> {
  const now = Date.now();
  if (!forceRefresh && cachedBulletin && now - lastGeneratedAt < BULLETIN_CACHE_TTL_MS) {
    return cachedBulletin;
  }

  const turns = await generateHourlyBulletinScript();

  // Synthesize turns in parallel for lightning-fast performance
  const synthesizedTurns: BulletinTurn[] = await Promise.all(
    turns.map(async (turn) => {
      try {
        const audioBuffer = await synthesizeClonedSpeech(turn.text, turn.voiceId, {
          model: 's2.1-pro-free',
          format: 'mp3',
        });
        return {
          ...turn,
          audioBase64: `data:audio/mp3;base64,${audioBuffer.toString('base64')}`,
          durationSeconds: Math.ceil(turn.text.split(' ').length / 2.5),
        };
      } catch (err) {
        console.warn(`Fish Audio synthesis failed for ${turn.anchorName}, continuing without audio:`, err);
        return {
          ...turn,
          durationSeconds: Math.ceil(turn.text.split(' ').length / 2.5),
        };
      }
    })
  );

  const totalDuration = synthesizedTurns.reduce((acc, t) => acc + (t.durationSeconds || 20), 0);
  const publicBaseUrl = (process.env.R2_PUBLIC_URL || '').replace(/^["']|["']$/g, '').replace(/\/$/, '');
  const introSweeperUrl = publicBaseUrl ? `${publicBaseUrl}/imaging/segments/news/intro/News%20Intro.mp3` : undefined;
  const outroSweeperUrl = introSweeperUrl; // Replays news intro stinger after traffic
  const newsBedUrl = publicBaseUrl ? `${publicBaseUrl}/imaging/segments/news/beds/news-bed.mp3` : undefined;
  const helicopterUrl = publicBaseUrl ? `${publicBaseUrl}/imaging/segments/traffic/helicopter.mp3` : undefined;

  const bulletin: HourlyBulletin = {
    id: `bulletin-${Date.now()}`,
    createdAt: new Date().toISOString(),
    introSweeperUrl,
    outroSweeperUrl,
    newsBedUrl,
    helicopterUrl,
    turns: synthesizedTurns,
    totalDurationSeconds: totalDuration,
  };

  cachedBulletin = bulletin;
  lastGeneratedAt = now;
  return bulletin;
}
