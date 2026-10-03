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

  // Resolve Sanity Image URL with square crop
  const sanityImageUrl = show.coverImage
    ? urlForImage(show.coverImage)?.width(800).height(800).fit("crop").url()
    : null;

  // Format host name
  let hostName = show.hostNames || "";
  if (!hostName && Array.isArray(show.hosts) && show.hosts.length > 0) {
    hostName = show.hosts.map((h: any) => h.name || h).join(" & ");
  }

  // Dynamic gradient palettes for placeholder when image has not yet been uploaded
  const GRADIENT_PALETTES = [
    "from-[#2E1065] via-[#4C1D95] to-[#7C3AED]", // Deep purple
    "from-[#064E3B] via-[#047857] to-[#10B981]", // Emerald
    "from-[#701A75] via-[#831843] to-[#BE185D]", // Magenta
    "from-[#1E293B] via-[#0F172A] to-[#334155]", // Dark slate
    "from-[#3F2C0A] via-[#78350F] to-[#D97706]", // Amber
    "from-[#172554] via-[#1E3A8A] to-[#2563EB]", // Royal blue
    "from-[#3B0764] via-[#581C87] to-[#9333EA]", // Violet
    "from-[#450A0A] via-[#7F1D1D] to-[#DC2626]", // Crimson
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
      hostIds: show.hostIds || [],
      hostNames: hostName,
      topics: [],
      musicGenres: [],
      vibe: show.vibe || "",
      shortDescription: show.description || "",
      detailedDescription: show.description || "",
      coverImage: show.coverImage,
      imageUrl: finalImageUrl,
    });

    const firstHostId = show.hostIds?.[0] || (show.hosts?.[0]?.slug) || undefined;
    triggerVoiceQuip(firstHostId);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative w-[260px] h-[260px] md:w-[280px] md:h-[280px] aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#CCFF00]/15 shrink-0 border select-none ${
        isCurrent
          ? "border-[#CCFF00] ring-2 ring-[#CCFF00]/40 shadow-lg shadow-[#CCFF00]/20"
          : "border-[#27272A]/80 hover:border-[#3F3F46]"
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
            <Disc3 size={48} className="text-[#CCFF00] animate-[spin_12s_linear_infinite]" />
          </div>
          <span className="mt-3 text-xs font-bold text-white/90 font-[family-name:var(--font-heading)] truncate max-w-[200px]">
            {show.title}
          </span>
        </div>
      )}

      {/* 2. Floating Hover Play Button (Spotify style - bottom right) */}
      <div className="absolute bottom-3 right-3 w-12 h-12 rounded-full bg-[#CCFF00] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl shadow-black/80 transform translate-y-2 group-hover:translate-y-0">
        <Play size={20} className="fill-current ml-0.5" />
      </div>

      {/* 3. Subtle on-air indicator pulse in top corner when playing */}
      {isCurrent && isPlaying && (
        <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-[#CCFF00] shadow-md shadow-black ring-2 ring-black animate-pulse" />
      )}
    </div>
  );
}
