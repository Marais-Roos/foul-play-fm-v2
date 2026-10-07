"use client";

import React from "react";
import Image from "next/image";
import { Play, Disc3 } from "lucide-react";
import { urlForImage } from "@/sanity/lib/image";
import { DEFAULT_SHOW_IMAGES } from "@/lib/data/station";
import { useAudioPlayer } from "./audio-context";

interface ShowCardProps {
  show: {
    _id?: string;
    id?: string;
    slug?: string;
    title: string;
    timeSlot: any;
    hosts?: any[];
    hostIds?: string[];
    hostNames?: string;
    coverImage?: any;
    imageWithOverlay?: any;
    imageWithoutOverlay?: any;
    studioImage?: any;
    imageUrl?: string;
    vibe?: string;
    description?: string;
  };
  index: number;
}

export function ShowCard({ show, index }: ShowCardProps) {
  const { currentShow, selectShow, triggerVoiceQuip, isPlaying } = useAudioPlayer();
  const showId = show.id || show._id || `show-${index}`;
  const isCurrent = currentShow.id === showId || currentShow.title === show.title;

  // Resolve Sanity Image URL with square crop (prefer thumbnailWithOverlay, fallback to imageWithOverlay or thumbnailWithoutOverlay)
  const rawCoverImage =
    (show as any).thumbnailWithOverlay ||
    show.imageWithOverlay ||
    show.coverImage ||
    (show as any).thumbnailWithoutOverlay ||
    show.imageWithoutOverlay;
  const sanityImageUrl = rawCoverImage
    ? urlForImage(rawCoverImage)?.width(800).height(800).fit("crop").url()
    : null;

  // Format host name
  let hostName = show.hostNames || "";
  if (!hostName && Array.isArray(show.hosts) && show.hosts.length > 0) {
    hostName = show.hosts.map((h: any) => h.name || h).join(" & ");
  }

  // Dynamic gradient palettes for placeholder when image has not yet been uploaded
  const GRADIENT_PALETTES = [
    "from-purple-950 via-purple-900 to-accent-purple", // Deep purple
    "from-emerald-950 via-emerald-900 to-emerald-600", // Emerald
    "from-fuchsia-950 via-pink-900 to-pink-700", // Magenta
    "from-slate-900 via-slate-950 to-slate-800", // Dark slate
    "from-amber-950 via-amber-900 to-amber-700", // Amber
    "from-blue-950 via-blue-900 to-blue-600", // Royal blue
    "from-purple-950 via-violet-900 to-violet-600", // Violet
    "from-red-950 via-red-900 to-red-600", // Crimson
  ];
  const gradientClass = GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];

  const handleCardClick = () => {
    const finalImageUrl =
      sanityImageUrl ||
      show.imageUrl ||
      DEFAULT_SHOW_IMAGES[showId] ||
      (show.slug ? DEFAULT_SHOW_IMAGES[show.slug] : undefined);

    selectShow({
      id: showId,
      title: show.title,
      timeSlot: typeof show.timeSlot === "number" ? {
        start: `${show.timeSlot.toString().padStart(2, "0")}:00`,
        end: `${((show.timeSlot + 3) % 24).toString().padStart(2, "0")}:00`,
        startHour: show.timeSlot,
        endHour: (show.timeSlot + 3) % 24,
      } : show.timeSlot,
      hostIds: (show.hostIds && show.hostIds.length > 0)
        ? show.hostIds
        : (Array.isArray(show.hosts) ? show.hosts.map((h: any) => h.slug || h._id) : []),
      hostNames: hostName,
      topics: [],
      musicGenres: [],
      vibe: show.vibe || "",
      shortDescription: show.description || "",
      detailedDescription: show.description || "",
      coverImage: rawCoverImage,
      imageWithOverlay: show.imageWithOverlay || show.coverImage,
      imageWithoutOverlay: show.imageWithoutOverlay,
      studioImage: show.studioImage,
      imageUrl: finalImageUrl,
    });

    const firstHostId = show.hostIds?.[0] || (show.hosts?.[0]?.slug) || undefined;
    triggerVoiceQuip(firstHostId);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative w-[260px] h-[260px] md:w-[280px] md:h-[280px] aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-accent-lime/15 shrink-0 border select-none ${
        isCurrent
          ? "border-accent-lime ring-2 ring-accent-lime/40 shadow-lg shadow-accent-lime/20"
          : "border-zinc-800/80 hover:border-zinc-700"
      }`}
    >
      {/* 1. Full Square Artwork from Sanity */}
      {sanityImageUrl ? (
        <Image
          src={sanityImageUrl}
          alt={show.title}
          fill
          sizes="(max-width: 768px) 260px, 280px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          priority={index < 4}
        />
      ) : (
        /* Fallback vinyl disc gradient placeholder only if no cover image is uploaded */
        <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center p-6 text-center relative overflow-hidden`}>
          <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
            <Disc3 size={48} className="text-accent-lime animate-[spin_12s_linear_infinite]" />
          </div>
          <span className="mt-3 text-xs font-bold text-foreground/90 font-heading truncate max-w-[200px]">
            {show.title}
          </span>
        </div>
      )}

      {/* 2. Floating Hover Play Button (Spotify style - bottom right) */}
      <div className="absolute bottom-3 right-3 w-12 h-12 rounded-full bg-accent-lime text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl shadow-black/80 transform translate-y-2 group-hover:translate-y-0">
        <Play size={20} className="fill-current ml-0.5" />
      </div>

      {/* 3. Subtle on-air indicator pulse in top corner when playing */}
      {isCurrent && isPlaying && (
        <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-accent-lime shadow-md shadow-black ring-2 ring-black animate-pulse" />
      )}
    </div>
  );
}
