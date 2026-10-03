import rawStationBible from './station-bible.json';
import { StationBible, Show, DJ, SideCharacter, CallerPersona } from '../types/station';

export const stationBible: StationBible = rawStationBible as StationBible;

/**
 * Returns the currently scheduled show based on local time (or provided date).
 */
export function getCurrentShow(date: Date = new Date()): Show {
  const currentHour = date.getHours();
  const show = stationBible.shows.find(s => {
    if (s.timeSlot.startHour < s.timeSlot.endHour) {
      return currentHour >= s.timeSlot.startHour && currentHour < s.timeSlot.endHour;
    } else {
      // Wraps around midnight (e.g. 21:00 to 00:00)
      return currentHour >= s.timeSlot.startHour || currentHour < (s.timeSlot.endHour === 24 ? 24 : s.timeSlot.endHour);
    }
  });

  return show || stationBible.shows[0];
}

/**
 * Get show by ID
 */
export function getShowById(id: string): Show | undefined {
  return stationBible.shows.find(s => s.id === id);
}

/**
 * Get DJ by ID or name slug
 */
export function getDJById(id: string): DJ | undefined {
  if (!id) return undefined;
  const clean = id.toLowerCase().replace(/[^a-z0-9]/g, '');
  return stationBible.djs.find(d => {
    const dClean = d.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nameClean = d.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return d.id === id || dClean === clean || dClean.includes(clean) || clean.includes(dClean) || nameClean.includes(clean);
  });
}

/**
 * Get side character by ID or name slug
 */
export function getSideCharacterById(id: string): SideCharacter | undefined {
  if (!id) return undefined;
  const clean = id.toLowerCase().replace(/[^a-z0-9]/g, '');
  return stationBible.sideCharacters.find(sc => {
    const scClean = sc.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nameClean = sc.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return sc.id === id || scClean === clean || scClean.includes(clean) || clean.includes(scClean) || nameClean.includes(clean);
  });
}

/**
 * Get caller persona by voice tag or ID
 */
export function getCallerByVoiceTag(tag: string): CallerPersona | undefined {
  if (!tag) return undefined;
  const clean = tag.toLowerCase().replace(/[^a-z0-9]/g, '');
  return stationBible.callers.find(c => {
    const cClean = c.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const tagClean = c.voiceTag.toLowerCase().replace(/[^a-z0-9]/g, '');
    return c.voiceTag === tag || c.id === tag || cClean === clean || tagClean === clean;
  });
}

/**
 * Get random caller persona for show generation
 */
export function getRandomCaller(): CallerPersona {
  const randomIndex = Math.floor(Math.random() * stationBible.callers.length);
  return stationBible.callers[randomIndex];
}
