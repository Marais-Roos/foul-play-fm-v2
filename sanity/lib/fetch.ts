import { client, isSanityConfigured } from './client';
import { SHOWS_QUERY, PRESENTERS_QUERY, CALLERS_QUERY } from './queries';
import { stationBible } from '@/lib/data/station';

export interface SanityShow {
  _id: string;
  title: string;
  slug: string;
  timeSlot: number;
  description?: string;
  vibe?: string;
  streamUrl?: string;
  coverImage?: any;
  hosts?: Array<{
    _id: string;
    name: string;
    slug?: string;
    image?: any;
    bio?: string;
    voicePrompt?: string;
    voiceSampleUrl?: string;
    parodyOf?: string;
  }>;
}

export interface SanityPresenter {
  _id: string;
  name: string;
  slug?: string;
  image?: any;
  bio?: string;
  voicePrompt?: string;
  voiceSampleUrl?: string;
  parodyOf?: string;
}

export interface SanityCaller {
  _id: string;
  voiceTag: string;
  archetype: string;
  targetOfSatire: string;
  contextStrategy?: string;
  voicePrompt?: string;
  sampleQuote?: string;
}

/**
 * Fetch all shows from Sanity (or fallback to local station bible if Sanity is not yet configured)
 */
export async function fetchShows(): Promise<SanityShow[]> {
  if (isSanityConfigured) {
    try {
      const data = await client.fetch<SanityShow[]>(SHOWS_QUERY);
      if (data && data.length > 0) return data;
    } catch (e) {
      console.warn('Failed to fetch shows from Sanity, using station bible fallback:', e);
    }
  }

  // Fallback to station-bible.json
  return stationBible.shows.map((s) => ({
    _id: `fallback-${s.id}`,
    title: s.title,
    slug: s.id,
    timeSlot: s.timeSlot.startHour,
    description: s.shortDescription || s.detailedDescription,
    vibe: s.vibe,
    streamUrl: undefined,
    coverImage: null,
    hosts: s.hostIds.map((hid) => {
      const dj = stationBible.djs.find((d) => d.id === hid);
      return {
        _id: `host-${hid}`,
        name: dj?.name || hid,
        slug: hid,
        image: null,
        bio: dj?.description || '',
        voicePrompt: dj?.personality || '',
        parodyOf: dj?.parodyOf || '',
      };
    }),
  }));
}

/**
 * Fetch all presenters from Sanity (or fallback)
 */
export async function fetchPresenters(): Promise<SanityPresenter[]> {
  if (isSanityConfigured) {
    try {
      const data = await client.fetch<SanityPresenter[]>(PRESENTERS_QUERY);
      if (data && data.length > 0) return data;
    } catch (e) {
      console.warn('Failed to fetch presenters from Sanity, using station bible fallback:', e);
    }
  }

  return stationBible.djs.map((dj) => ({
    _id: `presenter-${dj.id}`,
    name: dj.name,
    slug: dj.id,
    image: null,
    bio: dj.description,
    voicePrompt: dj.personality,
    parodyOf: dj.parodyOf,
  }));
}
