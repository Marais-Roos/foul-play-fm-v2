import rawStationBible from './station-bible.json' with { type: 'json' };
import { StationBible, Show, DJ, SideCharacter, CallerPersona } from '../types/station';
import { client, isSanityConfigured } from '@/sanity/lib/client';
import { SHOWS_QUERY, PRESENTERS_QUERY, CALLERS_QUERY, SIDE_CHARACTERS_QUERY } from '@/sanity/lib/queries';

export const DEFAULT_SHOW_IMAGES: Record<string, string> = {
  'truckers-tales-tacky-talk': 'https://cdn.sanity.io/images/fkbibl7o/production/90be52f1115123dca27e7ea6835fb67f31b3f1ab-1024x1024.png',
  'truckers-tales-and-tacky-talk': 'https://cdn.sanity.io/images/fkbibl7o/production/90be52f1115123dca27e7ea6835fb67f31b3f1ab-1024x1024.png',
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
  shows: rawStationBible.shows.map((s) => {
    const showCallers = (s as any).allowedCallerTags
      ? (s as any).allowedCallerTags
          .map((tag: string) => rawStationBible.callers.find((c) => c.voiceTag === tag))
          .filter(Boolean) as CallerPersona[]
      : undefined;

    return {
      ...s,
      imageUrl: DEFAULT_SHOW_IMAGES[s.id] || undefined,
      callers: showCallers,
    };
  }),
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
        const localShow = findMatchingShow(s.slug || s._id, s.title, stationBible.shows);
        
        const rawCoverImage = s.thumbnailWithOverlay || s.imageWithOverlay || s.coverImage;
        const rawCleanImage = s.thumbnailWithoutOverlay || s.imageWithoutOverlay;

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
          image: sc.thumbnailImage || sc.image,
          thumbnailImage: sc.thumbnailImage || sc.image,
          backdropImage: sc.backdropImage,
          voiceSampleUrl: sc.voiceSampleUrl,
        }));

        const callers: CallerPersona[] = (s.callers && s.callers.length > 0)
          ? s.callers.filter(Boolean).map((c: any) => {
              const localCaller = stationBible.callers.find(lc => lc.voiceTag === c.voiceTag || lc.id === c.voiceTag?.toLowerCase());
              const rawNames = c.callerNames
                ? c.callerNames.split(',').map((n: string) => n.trim()).filter(Boolean)
                : undefined;
              return {
                id: c.voiceTag || c._id,
                voiceTag: c.voiceTag,
                archetype: c.archetype || localCaller?.archetype || '',
                targetOfSatire: c.targetOfSatire || localCaller?.targetOfSatire || '',
                aiContextStrategy: c.contextStrategy || localCaller?.aiContextStrategy || '',
                description: localCaller?.description || c.voicePrompt || c.sampleQuote || '',
                voiceDesignPrompt: localCaller?.voiceDesignPrompt || '',
                recommendedPreviewText: c.sampleQuote || localCaller?.recommendedPreviewText || '',
                fishAudioVoiceId: c.fishAudioVoiceId || localCaller?.fishAudioVoiceId || null,
                voicePrompt: c.voicePrompt,
                gender: c.gender || (localCaller as any)?.gender,
                names: rawNames || (localCaller as any)?.names,
              };
            })
          : (localShow?.callers || []);

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
          imageUrl: (rawCoverImage || rawCleanImage) ? undefined : (localShow?.imageUrl || DEFAULT_SHOW_IMAGES[s.slug || s._id]),
          coverImage: rawCoverImage,
          thumbnailWithOverlay: rawCoverImage,
          imageWithOverlay: rawCoverImage,
          thumbnailWithoutOverlay: rawCleanImage,
          imageWithoutOverlay: rawCleanImage,
          studioImage: s.studioImage,
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

    // Substring fallback (only if both identifiers/names have minimum length to prevent empty string matches)
    if (cleanId && cleanId.length >= 4 && djCleanId && djCleanId.length >= 4 && (djCleanId.includes(cleanId) || cleanId.includes(djCleanId))) {
      return dj;
    }
    if (cleanName && cleanName.length >= 4 && djCleanName && djCleanName.length >= 4 && (djCleanName.includes(cleanName) || cleanName.includes(djCleanName))) {
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
          image: p.thumbnailImage || p.image,
          thumbnailImage: p.thumbnailImage || p.image,
          backdropImage: p.backdropImage,
          voiceSampleUrl: p.voiceSampleUrl,
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
          image: sc.thumbnailImage || sc.image,
          thumbnailImage: sc.thumbnailImage || sc.image,
          backdropImage: sc.backdropImage,
          voiceSampleUrl: sc.voiceSampleUrl,
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
        const rawNames = c.callerNames
          ? c.callerNames.split(',').map((n: string) => n.trim()).filter(Boolean)
          : undefined;
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
          gender: c.gender || (localCaller as any)?.gender,
          names: rawNames || (localCaller as any)?.names,
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
 * Station-wide timezone helper for Foul Play FM (anchored to Africa/Johannesburg, UTC+2).
 * Ensures server-side rendering, API routes (e.g. on Vercel), and international listeners
 * always evaluate station broadcast time correctly.
 */
export function getStationTime(date: Date = new Date()): { hour: number; minute: number; second: number } {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Johannesburg',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const second = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
    return { hour, minute, second };
  } catch {
    return { hour: date.getHours(), minute: date.getMinutes(), second: date.getSeconds() };
  }
}

/**
 * Resilient matcher between show IDs, Sanity slugs (which may convert '&' to 'and'), and titles.
 */
export function findMatchingShow(identifier?: string, title?: string, pool?: Show[]): Show | undefined {
  if (!identifier && !title) return undefined;
  const shows = pool || (cachedSanityShows && cachedSanityShows.length > 0 ? cachedSanityShows : stationBible.shows);

  const rawId = (identifier || '').toLowerCase().trim();
  const rawTitle = (title || '').toLowerCase().trim();

  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/['"“”‘’]/g, '')
      .replace(/&/g, '')
      .replace(/\band\b/g, '')
      .replace(/[^a-z0-9]/g, '');

  const cleanId = clean(rawId);
  const cleanTitle = clean(rawTitle);

  for (const show of shows) {
    const rawShowSlug = (show as any).slug;
    const rawShowDocId = (show as any)._id;
    const sId = (show.id || rawShowSlug || rawShowDocId || '').toLowerCase();
    const sTitle = (show.title || '').toLowerCase();
    const sCleanId = clean(sId);
    const sCleanTitle = clean(sTitle);

    // 1. Exact matches (checking show.id, Sanity slug, Sanity _id, and title)
    if (
      show.id === identifier ||
      rawShowSlug === identifier ||
      rawShowDocId === identifier ||
      (sId && sId === rawId) ||
      (show.title && show.title === title) ||
      (sTitle && sTitle === rawTitle)
    ) {
      return show;
    }

    // 2. Normalized matches (stripping 'and', '&', punctuation)
    if (cleanId && sCleanId && sCleanId === cleanId) {
      return show;
    }
    if (cleanId && sCleanTitle && sCleanTitle === cleanId) {
      return show;
    }
    if (cleanTitle && sCleanTitle && sCleanTitle === cleanTitle) {
      return show;
    }
    if (cleanTitle && sCleanId && sCleanId === cleanTitle) {
      return show;
    }

    // 3. Token match: check if all non-stop words match
    const idTokens = rawId.split(/[-_\s]+/).filter(t => t && t !== 'and' && t !== '&');
    if (idTokens.length >= 2 && idTokens.every(tok => (sId && sId.includes(tok)) || (sTitle && sTitle.includes(tok)))) {
      return show;
    }

    // 4. Substring containment fallback (requires minimum 5 chars on BOTH to prevent empty/short string collisions)
    if (cleanId.length >= 5 && sCleanId.length >= 5 && (sCleanId.includes(cleanId) || cleanId.includes(sCleanId))) {
      return show;
    }
    if (cleanTitle.length >= 5 && sCleanTitle.length >= 5 && (sCleanTitle.includes(cleanTitle) || cleanTitle.includes(sCleanTitle))) {
      return show;
    }
  }

  return undefined;
}

/**
 * Returns the currently scheduled show based on South African station time (or provided date),
 * prioritizing live data from Sanity CMS over local station bible.
 */
export function getCurrentShow(date: Date = new Date()): Show {
  const pool = cachedSanityShows && cachedSanityShows.length > 0 ? cachedSanityShows : stationBible.shows;
  const { hour: currentHour } = getStationTime(date);
  const show = pool.find(s => {
    if (s.timeSlot.startHour < s.timeSlot.endHour) {
      return currentHour >= s.timeSlot.startHour && currentHour < s.timeSlot.endHour;
    } else {
      // Wraps around midnight (e.g. 21:00 to 00:00)
      const effectiveEnd = (s.timeSlot.endHour === 0 || s.timeSlot.endHour === 24) ? 0 : s.timeSlot.endHour;
      return currentHour >= s.timeSlot.startHour || (effectiveEnd > 0 && currentHour < effectiveEnd);
    }
  });

  const selected = show || pool[0];
  return {
    ...selected,
    imageUrl: selected.imageUrl || DEFAULT_SHOW_IMAGES[selected.id] || DEFAULT_SHOW_IMAGES['truckers-tales-tacky-talk'],
  };
}

/**
 * Get show by ID, prioritizing live Sanity CMS data with resilient matching.
 */
export function getShowById(id: string): Show | undefined {
  const pool = cachedSanityShows && cachedSanityShows.length > 0 ? cachedSanityShows : stationBible.shows;
  const show = findMatchingShow(id, undefined, pool);
  if (!show) return undefined;
  return {
    ...show,
    imageUrl: show.imageUrl || DEFAULT_SHOW_IMAGES[show.id] || DEFAULT_SHOW_IMAGES['truckers-tales-tacky-talk'],
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
 * Calculates current real-time progress through a show's scheduled broadcast window
 * using South Africa station time.
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

  const { hour: currentHour, minute: currentMin, second: currentSec } = getStationTime(now);

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
 * Get DJ by ID or name slug, prioritizing live Sanity CMS presenters with resilient moniker matching.
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

    // Tokenized word match against Sanity DJs (handles nicknames/monikers)
    const idTokens = id.toLowerCase().split(/[-_\s]+/).filter(Boolean);
    if (idTokens.length >= 2) {
      const tokenFound = cachedSanityDJs.find(d => {
        const dId = d.id.toLowerCase();
        const dName = d.name.toLowerCase();
        return idTokens.every(tok => dId.includes(tok) || dName.includes(tok));
      });
      if (tokenFound) return tokenFound;
    }
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

export const KNOWN_CHARACTER_VOICE_IDS: Record<string, string> = {
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

export function resolveVoiceId(
  character?: { id?: string; slug?: string; name?: string; fishAudioVoiceId?: string | null } | null,
  fallbackId?: string
): string {
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

export function resolveSampleFile(
  character?: { id?: string; slug?: string; name?: string; voiceSampleFile?: string } | null,
  fallbackId?: string
): string {
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
