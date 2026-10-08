"use client";

import { useState, useEffect, useCallback } from "react";
import { client, isSanityConfigured } from "@/sanity/lib/client";
import { SHOWS_QUERY, PRESENTERS_QUERY, SIDE_CHARACTERS_QUERY } from "@/sanity/lib/queries";
import { stationBible } from "@/lib/data/station";

export interface SanityShowData {
  _id: string;
  id?: string;
  title: string;
  slug: string;
  timeSlot: number;
  description?: string;
  vibe?: string;
  jellyfinPlaylistId?: string;
  coverImage?: any;
  imageWithOverlay?: any;
  imageWithoutOverlay?: any;
  studioImage?: any;
  hosts?: Array<{
    _id: string;
    name: string;
    slug?: string;
    image?: any;
    bio?: string;
    voicePrompt?: string;
    voiceSampleUrl?: string;
    parodyOf?: string;
    fishAudioVoiceId?: string | null;
  }>;
  sideCharacters?: any[];
  callers?: any[];
}

export interface SanityPresenterData {
  _id: string;
  id?: string;
  name: string;
  slug?: string;
  image?: any;
  bio?: string;
  voicePrompt?: string;
  voiceSampleUrl?: string;
  parodyOf?: string;
  fishAudioVoiceId?: string | null;
}

export function useSanityStation() {
  const [shows, setShows] = useState<any[]>([]);
  const [presenters, setPresenters] = useState<any[]>([]);
  const [sideCharacters, setSideCharacters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<"sanity" | "fallback">("fallback");

  const loadData = useCallback(async () => {
    setIsLoading(true);

    if (isSanityConfigured) {
      try {
        const [sanityShows, sanityPresenters, sanitySideCharacters] = await Promise.all([
          client.fetch(SHOWS_QUERY),
          client.fetch(PRESENTERS_QUERY),
          client.fetch(SIDE_CHARACTERS_QUERY),
        ]);

        if (Array.isArray(sanityShows) && sanityShows.length > 0) {
          const normalizedShows = sanityShows.map((s: any) => ({
            ...s,
            id: s.slug || s._id,
          }));
          setShows(normalizedShows);
          setSource("sanity");
        } else {
          setShows(stationBible.shows);
          setSource("fallback");
        }

        if (Array.isArray(sanityPresenters) && sanityPresenters.length > 0) {
          setPresenters(sanityPresenters);
        } else {
          setPresenters(stationBible.djs);
        }

        if (Array.isArray(sanitySideCharacters) && sanitySideCharacters.length > 0) {
          setSideCharacters(sanitySideCharacters);
        } else {
          setSideCharacters(stationBible.sideCharacters);
        }

        setIsLoading(false);
        return;
      } catch (err) {
        console.warn("Could not fetch from Sanity, falling back to local station bible:", err);
      }
    }

    // Default local fallback
    setShows(stationBible.shows);
    setPresenters(stationBible.djs);
    setSideCharacters(stationBible.sideCharacters);
    setSource("fallback");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    shows,
    presenters,
    sideCharacters,
    isLoading,
    source,
    refetch: loadData,
  };
}
