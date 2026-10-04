import rawStationBible from './station-bible.json' with { type: 'json' };
import { StationBible, Show, DJ, SideCharacter, CallerPersona } from '../types/station';
import { client, isSanityConfigured } from '@/sanity/lib/client';
import { SHOWS_QUERY, PRESENTERS_QUERY, CALLERS_QUERY, SIDE_CHARACTERS_QUERY } from '@/sanity/lib/queries';

export const DEFAULT_SHOW_IMAGES: Record<string, string> = {
  'truckers-tales-tacky-talk': 'https://cdn.sanity.io/images/fkbibl7o/production/90be52f1115123dca27e7ea6835fb67f31b3f1ab-1024x1024.png',
  'the-tin-foil-takeover': 'https://cdn.sanity.io/images/fkbibl7o/production/9792aa9deb1b50f8a61a5afc7cd8c6df6493eccc-1024x1024.png',
  'morning-madness': 'https://cdn.sanity.io/images/fkbibl7o/production/b71cef41796e118ada529a1b62a887a5f1e5c9d7-1024x1024.png',
  'the-wacky-hour': 'https://cdn.sanity.io/images/fkbibl7o/production/c86fb94a1b025e8e2e3601ce5814b0512f570a35-1024x1024.png',
  'midday-mayhem': 'https://cdn.sanity.io/images/fkbibl7o/production/16f3022644d5f336aa58cda03dc434df28c250b2-1024x1024.png',
  'rush-hour-rants': 'https://cdn.sanity.io/images/fkbibl7o/production/5dc49243758d7d0afeb32fc64cf8bc7106a439bf-1024x1024.png',
  'the-funky-hour': 'https://cdn.sanity.io/images/fkbibl7o/production/4a15048acab5ebbf61e67cf54fc8e1195970bd5f-1024x1024.png',
  'after-dark-descent': 'https://cdn.sanity.io/images/fkbibl7o/production/b7b9081cf83a3594e6486218f0ba1c2d5168fff0-1024x1024.png',
  'the-graveyard-shift': 'https://cdn.sanity.io/images/fkbibl7o/production/b7b9081cf83a3594e6486218f0ba1c2d5168fff0-1024x1024.png',
};

export const stationBible: StationBible = {
  ...rawStationBible,
  shows: rawStationBible.shows.map((s) => ({
    ...s,
    imageUrl: DEFAULT_SHOW_IMAGES[s.id] || undefined,
  })),
} as StationBible;

// Fast cache for Sanity queries (5 seconds) so updates in Sanity Studio reflect immediately
let cachedSanityShows: Show[] | null = null;
let cachedSanityDJs: DJ[] | null = null;
let cachedSanitySideCharacters: SideCharacter[] | null = null;
let cachedSanityCallers: CallerPersona[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5000; // 5 seconds for near-instant updates

/**
 * Fetch shows dynamically from Sanity CMS with station bible fallback
 */
export async function fetchSanityShows(): Promise<Show[]> {
  const now = Date.now();
  if (cachedSanityShows && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedSanityShows;
  }
  if (!isSanityConfigured) return stationBible.shows;

  try {
    const rawShows = await client.fetch(SHOWS_QUERY);
    if (Array.isArray(rawShows) && rawShows.length > 0) {
      const mapped: Show[] = rawShows.map((s: any) => {
        const startHour = typeof s.timeSlot === 'number' ? s.timeSlot : parseInt(s.timeSlot || '0', 10);
        const endHour = (startHour + 3) % 24;
        const hostIds = s.hosts?.map((h: any) => h.slug || h._id) || [];
        const hostNames = s.hosts?.map((h: any) => h.name).join(' & ') || 'Live Host';
        const localShow = stationBible.shows.find(ls => ls.id === (s.slug || s._id) || ls.title === s.title);
        
        const sideCharacters: SideCharacter[] = (s.sideCharacters || []).map((sc: any) => ({
          id: sc.slug || sc._id,
          name: sc.name,
          parodyOf: sc.parodyOf || '',
          role: sc.role || 'Guest',
          description: sc.bio || '',
          aiPersonalityPrompt: sc.voicePrompt || '',
          voiceDesignPrompt: '',
          recommendedPreviewText: '',
          voiceSampleFile: '',
          fishAudioVoiceId: sc.fishAudioVoiceId || null,
        }));

        const callers: CallerPersona[] = (s.callers || []).map((c: any) => ({
          id: c.voiceTag || c._id,
          voiceTag: c.voiceTag,
          archetype: c.archetype,
          targetOfSatire: c.targetOfSatire || '',
          aiContextStrategy: c.contextStrategy || '',
          description: c.sampleQuote || '',
          voiceDesignPrompt: '',
          recommendedPreviewText: c.sampleQuote || '',
          fishAudioVoiceId: c.fishAudioVoiceId || null,
          voicePrompt: c.voicePrompt,
        }));

        return {
          id: s.slug || s._id,
          title: s.title,
          description: s.description || localShow?.description || '',
          shortDescription: s.description || localShow?.shortDescription || '',
          detailedDescription: s.description || localShow?.detailedDescription || '',
          vibe: s.vibe || localShow?.vibe || '',
          topics: localShow?.topics || ['General banter', 'Current affairs'],
          musicGenres: localShow?.musicGenres || ['Rock', 'Country', 'Variety'],
          jellyfinPlaylistId: s.jellyfinPlaylistId || localShow?.jellyfinPlaylistId || '',
          timeSlot: {
            start: `${startHour.toString().padStart(2, '0')}:00`,
            end: `${endHour.toString().padStart(2, '0')}:00`,
            startHour,
            endHour,
          },
          hostIds: hostIds.length > 0 ? hostIds : (localShow?.hostIds || []),
          hostNames: hostNames || (localShow?.hostNames || 'Live Host'),
          imageUrl: s.coverImage ? undefined : (localShow?.imageUrl || DEFAULT_SHOW_IMAGES[s.slug || s._id]),
          coverImage: s.coverImage,
          sideCharacters: sideCharacters.length > 0 ? sideCharacters : undefined,
          callers: callers.length > 0 ? callers : undefined,
        };
      });
      cachedSanityShows = mapped;
      lastCacheTime = now;
      return mapped;
    }
  } catch (err) {
    console.warn('Could not query Sanity shows, using fallback station bible:', err);
  }
  return stationBible.shows;
}

/**
 * Resilient matcher between Sanity presenter slugs/names and local station bible entries.
 * Normalizes nicknames (e.g. Chip "The Fearmonger" Walton -> Chip Walton) and tokenized slugs.
 */
export function findMatchingLocalDJ(identifier?: string, name?: string): DJ | undefined {
  if (!identifier && !name) return undefined;
  
  const rawId = (identifier || '').toLowerCase().trim();
  const rawName = (name || '').toLowerCase().trim();
  const cleanId = rawId.replace(/[^a-z0-9]/g, '');
  const cleanName = rawName.replace(/[^a-z0-9]/g, '');

  for (const dj of stationBible.djs) {
    const djId = dj.id.toLowerCase();
    const djName = dj.name.toLowerCase();
    const djCleanId = djId.replace(/[^a-z0-9]/g, '');
    const djCleanName = djName.replace(/[^a-z0-9]/g, '');

    // Exact matches
    if (dj.id === identifier || djId === rawId || dj.name === name || djName === rawName) {
      return dj;
    }

    // Stripped moniker match e.g. "Chip \"The Fearmonger\" Walton" -> "Chip Walton"
    const strippedDjName = djName.replace(/["'“].*?["'”]/g, '').replace(/\s+/g, ' ').trim();
    if (strippedDjName === rawName) {
      return dj;
    }

    // Token match: check if all words in identifier or name are present in dj
    const idTokens = rawId.split(/[-_\s]+/).filter(Boolean);
    if (idTokens.length >= 2 && idTokens.every(tok => djId.includes(tok))) {
      return dj;
    }

    const nameTokens = rawName.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    if (nameTokens.length >= 2 && nameTokens.every(tok => djName.includes(tok))) {
      return dj;
    }

    // Substring fallback
    if (cleanId && (djCleanId.includes(cleanId) || cleanId.includes(djCleanId))) {
      return dj;
    }
    if (cleanName && (djCleanName.includes(cleanName) || cleanName.includes(djCleanName))) {
      return dj;
    }
  }

  return undefined;
}

/**
 * Fetch presenters dynamically from Sanity CMS with station bible fallback
 */
export async function fetchSanityPresenters(): Promise<DJ[]> {
  const now = Date.now();
  if (cachedSanityDJs && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedSanityDJs;
  }
  if (!isSanityConfigured) return stationBible.djs;

  try {
    const rawPresenters = await client.fetch(PRESENTERS_QUERY);
    if (Array.isArray(rawPresenters) && rawPresenters.length > 0) {
      const mapped: DJ[] = rawPresenters.map((p: any) => {
        const localDj = findMatchingLocalDJ(p.slug || p._id, p.name);
        return {
          id: p.slug || p._id,
          name: p.name,
          parodyOf: p.parodyOf || localDj?.parodyOf || '',
          description: p.bio || localDj?.description || '',
          personality: p.voicePrompt || localDj?.personality || '',
          voiceSampleFile: localDj?.voiceSampleFile || '',
          fishAudioVoiceId: p.fishAudioVoiceId || localDj?.fishAudioVoiceId || null,
          voicePrompt: p.voicePrompt,
          bio: p.bio,
        };
      });
      cachedSanityDJs = mapped;
      lastCacheTime = now;
      return mapped;
    }
  } catch (err) {
    console.warn('Could not query Sanity presenters, using fallback station bible:', err);
  }
  return stationBible.djs;
}

/**
 * Fetch side characters dynamically from Sanity CMS with station bible fallback
 */
export async function fetchSanitySideCharacters(): Promise<SideCharacter[]> {
  const now = Date.now();
  if (cachedSanitySideCharacters && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedSanitySideCharacters;
  }
  if (!isSanityConfigured) return stationBible.sideCharacters;

  try {
    const rawSideCharacters = await client.fetch(SIDE_CHARACTERS_QUERY);
    if (Array.isArray(rawSideCharacters) && rawSideCharacters.length > 0) {
      const mapped: SideCharacter[] = rawSideCharacters.map((sc: any) => {
        const localSc = stationBible.sideCharacters.find(
          s => s.id === (sc.slug || sc._id) || s.name.toLowerCase() === (sc.name || '').toLowerCase()
        );
        return {
          id: sc.slug || sc._id,
          name: sc.name,
          parodyOf: sc.parodyOf || localSc?.parodyOf || '',
          role: sc.role || localSc?.role || 'Guest',
          description: sc.bio || localSc?.description || '',
          aiPersonalityPrompt: sc.voicePrompt || localSc?.aiPersonalityPrompt || '',
          voiceDesignPrompt: localSc?.voiceDesignPrompt || '',
          recommendedPreviewText: localSc?.recommendedPreviewText || '',
          voiceSampleFile: localSc?.voiceSampleFile || '',
          fishAudioVoiceId: sc.fishAudioVoiceId || localSc?.fishAudioVoiceId || null,
        };
      });
      cachedSanitySideCharacters = mapped;
      lastCacheTime = now;
      return mapped;
    }
  } catch (err) {
    console.warn('Could not query Sanity side characters, using fallback station bible:', err);
  }
  return stationBible.sideCharacters;
}

/**
 * Fetch callers dynamically from Sanity CMS with station bible fallback
 */
export async function fetchSanityCallers(): Promise<CallerPersona[]> {
  const now = Date.now();
  if (cachedSanityCallers && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedSanityCallers;
  }
  if (!isSanityConfigured) return stationBible.callers;

  try {
    const rawCallers = await client.fetch(CALLERS_QUERY);
    if (Array.isArray(rawCallers) && rawCallers.length > 0) {
      const mapped: CallerPersona[] = rawCallers.map((c: any) => {
        const localCaller = stationBible.callers.find(lc => lc.voiceTag === c.voiceTag);
        return {
          id: c.voiceTag || c._id,
          voiceTag: c.voiceTag,
          archetype: c.archetype,
          targetOfSatire: c.targetOfSatire || localCaller?.targetOfSatire || '',
          aiContextStrategy: c.contextStrategy || localCaller?.aiContextStrategy || '',
          description: localCaller?.description || c.sampleQuote || '',
          voiceDesignPrompt: localCaller?.voiceDesignPrompt || '',
          recommendedPreviewText: c.sampleQuote || localCaller?.recommendedPreviewText || '',
          fishAudioVoiceId: c.fishAudioVoiceId || localCaller?.fishAudioVoiceId || null,
          voicePrompt: c.voicePrompt,
        };
      });
      cachedSanityCallers = mapped;
      lastCacheTime = now;
      return mapped;
    }
  } catch (err) {
    console.warn('Could not query Sanity callers, using fallback station bible:', err);
  }
  return stationBible.callers;
}

/**
 * Returns the currently scheduled show based on local time (or provided date),
 * prioritizing live data from Sanity CMS over local station bible.
 */
export function getCurrentShow(date: Date = new Date()): Show {
  const pool = cachedSanityShows && cachedSanityShows.length > 0 ? cachedSanityShows : stationBible.shows;
  const currentHour = date.getHours();
  const show = pool.find(s => {
    if (s.timeSlot.startHour < s.timeSlot.endHour) {
      return currentHour >= s.timeSlot.startHour && currentHour < s.timeSlot.endHour;
    } else {
      // Wraps around midnight (e.g. 21:00 to 00:00)
      return currentHour >= s.timeSlot.startHour || currentHour < (s.timeSlot.endHour === 24 ? 24 : s.timeSlot.endHour);
    }
  });

  const selected = show || pool[0];
  return {
    ...selected,
    imageUrl: selected.imageUrl || DEFAULT_SHOW_IMAGES[selected.id],
  };
}

/**
 * Get show by ID, prioritizing live Sanity CMS data.
 */
export function getShowById(id: string): Show | undefined {
  const pool = cachedSanityShows && cachedSanityShows.length > 0 ? cachedSanityShows : stationBible.shows;
  const show = pool.find(s => s.id === id || s.id.includes(id) || id.includes(s.id));
  if (!show) return undefined;
  return {
    ...show,
    imageUrl: show.imageUrl || DEFAULT_SHOW_IMAGES[show.id],
  };
}

export interface ShowProgressInfo {
  startTimeStr: string;
  endTimeStr: string;
  progressPercent: number;
  isOnAir: boolean;
  elapsedSeconds: number;
  totalSeconds: number;
}

/**
 * Calculates current real-time progress through a show's scheduled broadcast window.
 */
export function calculateShowProgress(show: Show, now: Date = new Date()): ShowProgressInfo {
  let startHour = 18;
  let endHour = 21;
  let startTimeStr = "18:00";
  let endTimeStr = "21:00";

  if (show?.timeSlot) {
    if (typeof show.timeSlot === "number") {
      startHour = show.timeSlot;
      endHour = (show.timeSlot + 3) % 24;
      startTimeStr = `${startHour.toString().padStart(2, "0")}:00`;
      endTimeStr = `${endHour.toString().padStart(2, "0")}:00`;
    } else {
      startTimeStr = show.timeSlot.start || "18:00";
      endTimeStr = show.timeSlot.end || "21:00";
      const partsStart = startTimeStr.split(":");
      startHour = typeof show.timeSlot.startHour === "number"
        ? show.timeSlot.startHour
        : parseInt(partsStart[0], 10);
      const partsEnd = endTimeStr.split(":");
      endHour = typeof show.timeSlot.endHour === "number"
        ? show.timeSlot.endHour
        : parseInt(partsEnd[0], 10);
    }
  }

  const effectiveEndHour = (endHour === 0 || endHour <= startHour) ? endHour + 24 : endHour;
  const startMinutes = startHour * 60;
  const endMinutes = effectiveEndHour * 60;
  const totalMinutes = Math.max(1, endMinutes - startMinutes);
  const totalSeconds = totalMinutes * 60;

  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentSec = now.getSeconds();

  let currentTotalMinutes = currentHour * 60 + currentMin + currentSec / 60;
  if (effectiveEndHour > 24 && currentHour < endHour) {
    currentTotalMinutes += 24 * 60;
  }

  const isOnAir = currentTotalMinutes >= startMinutes && currentTotalMinutes < endMinutes;

  let progressPercent = 0;
  let elapsedSeconds = 0;
  if (isOnAir) {
    const elapsedMinutes = currentTotalMinutes - startMinutes;
    elapsedSeconds = Math.floor(elapsedMinutes * 60);
    progressPercent = Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100));
  } else if (currentTotalMinutes >= endMinutes) {
    elapsedSeconds = totalSeconds;
    progressPercent = 100;
  } else {
    elapsedSeconds = 0;
    progressPercent = 0;
  }

  return {
    startTimeStr,
    endTimeStr,
    progressPercent,
    isOnAir,
    elapsedSeconds,
    totalSeconds,
  };
}

/**
 * Get DJ by ID or name slug, prioritizing live Sanity CMS presenters
 */
export function getDJById(id: string): DJ | undefined {
  if (!id) return undefined;
  const clean = id.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (cachedSanityDJs && cachedSanityDJs.length > 0) {
    const found = cachedSanityDJs.find(d => {
      const dClean = d.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const nameClean = d.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return d.id === id || dClean === clean || dClean.includes(clean) || clean.includes(dClean) || nameClean.includes(clean);
    });
    if (found) return found;
  }

  return findMatchingLocalDJ(id);
}

/**
 * Get side character by ID or name slug
 */
export function getSideCharacterById(id: string): SideCharacter | undefined {
  if (!id) return undefined;
  const clean = id.toLowerCase().replace(/[^a-z0-9]/g, '');
  const pool = cachedSanitySideCharacters && cachedSanitySideCharacters.length > 0
    ? cachedSanitySideCharacters
    : stationBible.sideCharacters;
  return pool.find(sc => {
    const scClean = sc.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nameClean = sc.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return sc.id === id || scClean === clean || scClean.includes(clean) || clean.includes(scClean) || nameClean.includes(clean);
  });
}

/**
 * Get caller persona by voice tag or ID, prioritizing Sanity CMS callers
 */
export function getCallerByVoiceTag(tag: string): CallerPersona | undefined {
  if (!tag) return undefined;
  const clean = tag.toLowerCase().replace(/[^a-z0-9]/g, '');
  const pool = cachedSanityCallers && cachedSanityCallers.length > 0
    ? cachedSanityCallers
    : stationBible.callers;
  return pool.find(c => {
    const cClean = c.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const tagClean = c.voiceTag.toLowerCase().replace(/[^a-z0-9]/g, '');
    return c.voiceTag === tag || c.id === tag || cClean === clean || tagClean === clean;
  });
}

/**
 * Get random caller persona for show generation, prioritizing Sanity CMS callers
 */
export function getRandomCaller(): CallerPersona {
  const pool = cachedSanityCallers && cachedSanityCallers.length > 0
    ? cachedSanityCallers
    : stationBible.callers;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}
