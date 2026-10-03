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
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.articles) && data.articles.length > 0) {
        return data.articles.map((a: any) => a.title).filter(Boolean);
      }
    }

    // Secondary fallback: General SA search
    const query = encodeURIComponent(`"South Africa" AND (economy OR police OR parliament OR Eskom OR minister OR president)`);
    const fallbackRes = await fetch(`https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&language=en&pageSize=4&apiKey=${apiKey}`);
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
    const res = await fetch(url, { next: { revalidate: 300 } });
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
 * 3. Fetch Real-Time Gauteng Weather (Johannesburg & Pretoria)
 */
export async function fetchGautengWeather(): Promise<string> {
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=-26.2041&longitude=28.0473&current=temperature_2m,weather_code,wind_speed_10m',
      { next: { revalidate: 300 } }
    );
    if (res.ok) {
      const data = await res.json();
      const temp = Math.round(data.current?.temperature_2m ?? 18);
      const code = data.current?.weather_code ?? 0;
      const condition = code <= 2 ? 'clear skies' : code <= 48 ? 'partly cloudy' : 'scattered showers';
      return `Johannesburg sitting at ${temp} degrees Celsius with ${condition}, Pretoria 2 degrees warmer.`;
    }
  } catch (err) {
    console.warn('Weather fetch failed, using fallback:', err);
  }

  return 'Johannesburg sitting at 14 degrees Celsius under clear skies, Pretoria at 16 degrees.';
}

export interface TrafficIncidentItem {
  id: string;
  road: string;
  description: string;
  from?: string;
  to?: string;
  delayMinutes: number;
}

const TARGET_HIGHWAY_CORRIDORS = ['N1', 'N3', 'N4', 'N12', 'M1', 'R21', 'R24', 'R59'];

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

  // 3. Key known highway interchanges on these specific routes
  if (text.includes('BUCCLEUCH')) return 'N1/N3 (Buccleuch)';
  if (text.includes('GILLOOLY')) return 'N3/R24 (Gilloolys)';
  if (text.includes('READING INTERCHANGE')) return 'N12/R59 (Reading)';
  if (text.includes('DOUBLE DECKER')) return 'M1 (Double Decker)';
  if (text.includes('ALLANDALE')) return 'N1 (Allandale)';

  return null;
}

/**
 * 4. Fetch Structured Live TomTom Gauteng Traffic Incidents (Primary Arteries Only)
 * Filters strictly for: R59, N1, N12, R24, R21, N3, N4, M1.
 */
export async function fetchStructuredTomTomTraffic(): Promise<TrafficIncidentItem[]> {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) return [];

  try {
    const fields =
      '{incidents{type,properties{id,iconCategory,magnitudeOfDelay,events{description,code},from,to,length,delay,roadNumbers}}}';
    // Bbox covering R59 (south to Vaal), N4 (north/west to Brits/Pretoria), N1, N12, N3, M1, R21, R24
    const bbox = '27.7,-26.6,28.4,-25.65';
    const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=${bbox}&fields=${encodeURIComponent(
      fields
    )}&language=en-GB&key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      const raw = data.incidents || [];

      const matched: TrafficIncidentItem[] = [];

      for (const i of raw) {
        const props = i.properties || {};
        const corridor = identifyHighwayCorridor(props);
        // Strictly ignore suburban / local backstreets
        if (!corridor) continue;

        const delaySec = props.delay || 0;
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

      return matched.slice(0, 5);
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

  const systemInstruction = `You are the executive broadcast editor for Foul Play FM (98.4 FM), South Africa.
Generate the top-of-the-hour broadcast bulletin featuring three distinct anchors in succession.

CRITICAL EDITORIAL RULES:
1. MAINTAIN ACCURATE REAL-WORLD FACTS: Do NOT invent fake conspiracies or distort the news. The listener must genuinely understand the real headlines of the day.
2. NO POLITICAL AGENDA: Adopt a dry, grounded libertarian perspective—wry scepticism of bureaucratic waste, state inefficiency, and regulatory bloat. No unhinged conspiracy theories.
3. NO AMERICAN SPORTS (No NFL, NBA, baseball). Focus purely on Rugby (Springboks/Bulls/URC), Football (Premier League/Man United/Barca/Champions League), and Cricket (Proteas).
4. SIMON CARTER IS AT THE STUDIO TRAFFIC DESK (He does NOT fly in a helicopter! Remove all chopper references). He is a Tom Cruise / Maverick intense studio reporter analyzing traffic screens and live cameras.

THE ANCHORS:
1. GAVIN STONE (News & Weather):
   - Role: Lead News Anchor & Investigative Journalist.
   - Delivery: Serious, staccato, inquisitive cadence (Tucker Carlson style). Reports the real SA headlines accurately with dry libertarian wit. Concludes with the real Gauteng weather.
   - Outro: Hands over smoothly to Gary Miller for sport.

2. GARY MILLER (Sport):
   - Role: Sports Pundit.
   - Delivery: Grumpy, brutal, cynical (Roy Keane style). Hates soft athletes and showboating ("It is his job!"). Reports the real sports news.
   - Outro: Hands over with a disgusted sigh to Simon Carter at the traffic desk.

3. SIMON CARTER (Traffic Desk):
   - Role: Senior Traffic Desk Anchor (IN THE STUDIO).
   - Delivery: Intense, breathless, high-stakes urgency (Tom Cruise / Maverick intensity). Reads the real TomTom incidents on the N1/M1/Buccleuch with dramatic focus.
   - Outro: Throws back to the show host or music ("Back to the studio!").

Output STRICT JSON schema:
[
  {"anchorId": "gavin-stone", "anchorName": "Gavin Stone", "segment": "News & Weather", "text": "..."},
  {"anchorId": "gary-miller", "anchorName": "Gary Miller", "segment": "Sport", "text": "..."},
  {"anchorId": "simon-carter", "anchorName": "Simon Carter", "segment": "Traffic Desk", "text": "..."}
]
No markdown fences, no stage directions, no asterisks.`;

  const userPrompt = `Live Ingested Data for this bulletin:
SA HEADLINES: ${saNews.join("; ")}
SPORTS HEADLINES: ${sports.join("; ")}
WEATHER: ${weather}
GAUTENG TRAFFIC: ${traffic.join("; ")}

Write the full top-of-the-hour bulletin now.`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
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
        text: `Good evening, this is Gavin Stone with the top-of-the-hour bulletin on Foul Play FM. The Special Investigating Unit has been called in to probe allegations that critical healthcare funding was diverted into advertising campaigns. Why does the taxpayer always end up funding government public relations while waiting lists grow? Over in Gauteng tonight, ${weather}. Gary Miller has the sport.`,
      },
      {
        anchorId: 'gary-miller',
        anchorName: 'Gary Miller',
        segment: 'Sport',
        text: `Thanks Gavin. The Vodacom Bulls are in final preparation for their massive United Rugby Championship encounter. Modern players like to post on social media and show off fancy boots, but rugby is about winning your collisions and doing your job. Simon Carter is at the traffic desk.`,
      },
      {
        anchorId: 'simon-carter',
        anchorName: 'Simon Carter',
        segment: 'Traffic Desk',
        text: traffic && traffic.length > 0
          ? `Carter at the traffic desk, tracking every live corridor on our screens! ${traffic.join('. ')}. Keep your eyes on the road and stay focused! Back to the studio!`
          : `Carter at the traffic desk! Real-time highway telemetry shows all major corridors running clear across Gauteng with zero incident delays reported right now. Keep your speeds steady and stay alert! Back to the studio!`,
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
  const synthesizedTurns: BulletinTurn[] = [];

  for (const turn of turns) {
    try {
      const audioBuffer = await synthesizeClonedSpeech(turn.text, turn.voiceId, {
        model: 's2.1-pro-free',
        format: 'mp3',
      });
      synthesizedTurns.push({
        ...turn,
        audioBase64: `data:audio/mp3;base64,${audioBuffer.toString('base64')}`,
        durationSeconds: Math.ceil(turn.text.split(' ').length / 2.5),
      });
    } catch (err) {
      console.warn(`Fish Audio synthesis failed for ${turn.anchorName}, continuing without audio:`, err);
      synthesizedTurns.push({
        ...turn,
        durationSeconds: Math.ceil(turn.text.split(' ').length / 2.5),
      });
    }
  }

  const totalDuration = synthesizedTurns.reduce((acc, t) => acc + (t.durationSeconds || 20), 0);
  const publicBaseUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  const introSweeperUrl = publicBaseUrl ? `${publicBaseUrl}/imaging/segments/news/intro/News%20Intro.mp3` : undefined;

  const bulletin: HourlyBulletin = {
    id: `bulletin-${Date.now()}`,
    createdAt: new Date().toISOString(),
    introSweeperUrl,
    turns: synthesizedTurns,
    totalDurationSeconds: totalDuration,
  };

  cachedBulletin = bulletin;
  lastGeneratedAt = now;
  return bulletin;
}
