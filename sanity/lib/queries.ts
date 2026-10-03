import { groq } from 'next-sanity';

export const SHOWS_QUERY = groq`
  *[_type == "show"] | order(timeSlot asc) {
    _id,
    title,
    "slug": slug.current,
    timeSlot,
    description,
    vibe,
    jellyfinPlaylistId,
    coverImage,
    hosts[]->{
      _id,
      name,
      "slug": slug.current,
      image,
      bio,
      voicePrompt,
      "voiceSampleUrl": voiceSample.asset->url,
      parodyOf
    }
  }
`;

export const PRESENTERS_QUERY = groq`
  *[_type == "presenter"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    image,
    bio,
    voicePrompt,
    "voiceSampleUrl": voiceSample.asset->url,
    parodyOf
  }
`;

export const CALLERS_QUERY = groq`
  *[_type == "caller"] | order(archetype asc) {
    _id,
    voiceTag,
    archetype,
    targetOfSatire,
    contextStrategy,
    voicePrompt,
    sampleQuote
  }
`;
