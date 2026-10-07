"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Play, Pause, Volume2, VolumeX, Radio, Sparkles, Mic, Disc3 } from "lucide-react";
import { urlForImage } from "@/sanity/lib/image";
import { DEFAULT_SHOW_IMAGES, calculateShowProgress } from "@/lib/data/station";
import { useAudioPlayer } from "../audio-context";

export function AudioPlayerBar() {
  const {
    isPlaying,
    togglePlay,
    currentTrack,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    currentShow,
    activeSpeaker,
    activeTranscript,
    isGeneratingVoice,
    isDucking,
    triggerVoiceQuip,
  } = useAudioPlayer();

  // Dynamic real-time clock to drive accurate show schedule progress
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { startTimeStr, endTimeStr, progressPercent, isOnAir } = useMemo(() => {
    return calculateShowProgress(currentShow, now);
  }, [currentShow, now]);

  // Robust artwork thumbnail resolution:
  // 1. Sanity imageWithOverlay / coverImage / imageWithoutOverlay (uploaded crop)
  // 2. Direct show imageUrl property
  // 3. Official station CDN image fallback by show id/slug
  const activeImage =
    currentShow.thumbnailWithOverlay ||
    currentShow.imageWithOverlay ||
    currentShow.coverImage ||
    currentShow.thumbnailWithoutOverlay ||
    currentShow.imageWithoutOverlay;
  const thumbnailSrc =
    (activeImage ? urlForImage(activeImage)?.width(160).height(160).fit("crop").url() : null) ||
    currentShow.imageUrl ||
    DEFAULT_SHOW_IMAGES[currentShow.id] ||
    null;

  return (
    <footer className="h-20 sm:h-22 bg-background/95 backdrop-blur-md border-t border-zinc-900 px-3 sm:px-6 flex items-center justify-between z-50 select-none relative">
      {/* Mobile Micro Progress Bar on top border */}
      <div
        suppressHydrationWarning
        className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-800 md:hidden overflow-hidden"
      >
        <div
          suppressHydrationWarning
          className="h-full bg-gradient-to-r from-accent-purple via-purple-500 to-accent-lime transition-all duration-1000 ease-linear"
          style={{ width: `${mounted ? progressPercent.toFixed(2) : 0}%` }}
        />
      </div>

      {/* Floating Subtitle Banner for Active DJ Voice (Mobile & Desktop) */}
      {activeTranscript && (
        <div className="fixed bottom-22 sm:bottom-24 left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 bg-zinc-900/95 border border-accent-lime/50 text-foreground px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-medium flex flex-col gap-1 shadow-2xl backdrop-blur-md z-50 max-w-full md:max-w-[560px] md:w-max animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-lime shrink-0 opacity-80" />
            <span className="font-bold text-accent-lime shrink-0 uppercase tracking-wider text-[11px]">
              {activeSpeaker} on-air:
            </span>
          </div>
          <div className="text-zinc-200 text-xs font-sans whitespace-pre-line leading-relaxed max-h-[90px] overflow-y-auto">
            {activeTranscript}
          </div>
        </div>
      )}

      {/* 1. Left: Current Show Info & Track Details */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1 md:flex-initial md:w-64 lg:w-72">
        <div className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-zinc-900 shrink-0 border border-zinc-800 flex items-center justify-center">
          {thumbnailSrc ? (
            <Image
              src={thumbnailSrc}
              alt={currentShow.title}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent-purple/30 to-accent-lime/20 flex items-center justify-center">
              <Disc3
                size={22}
                className={`text-accent-lime ${isPlaying ? "animate-[spin_4s_linear_infinite]" : ""}`}
              />
            </div>
          )}

          {isPlaying && (
            <div className="absolute top-1 right-1 flex gap-0.5 items-end h-2.5 sm:h-3 bg-black/70 px-1 py-0.5 rounded shadow">
              <span className="w-0.5 bg-accent-lime h-full animate-[bounce_0.8s_infinite]" />
              <span className="w-0.5 bg-accent-lime h-2/3 animate-[bounce_0.6s_infinite]" />
              <span className="w-0.5 bg-accent-lime h-4/5 animate-[bounce_1s_infinite]" />
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate font-heading">
              {currentShow.title}
            </h4>
            {isOnAir ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 sm:py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-accent-lime/10 text-accent-lime border border-accent-lime/20 shrink-0">
                <Radio size={9} className="animate-pulse" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 sm:py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0">
                Replay
              </span>
            )}
          </div>

          {currentTrack ? (
            <p className="text-[11px] sm:text-xs text-zinc-200 font-medium truncate mt-0.5">
              <span className="text-accent-lime">♫</span> {currentTrack.title}{" "}
              <span className="text-zinc-400 font-normal">• {currentTrack.artist}</span>
            </p>
          ) : (
            <p className="text-[11px] sm:text-xs text-zinc-400 truncate mt-0.5">
              {currentShow.hostNames}
            </p>
          )}

          {isDucking && activeSpeaker && (
            <div className="flex items-center gap-1 mt-0.5 text-[10px] sm:text-[11px] font-medium text-accent-lime animate-pulse truncate">
              <Mic size={11} className="shrink-0" />
              <span className="truncate">{activeSpeaker} on-air</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Center: Timeline & Progress Bar (Desktop view) */}
      <div className="hidden md:flex relative flex-1 max-w-md lg:max-w-xl px-4 lg:px-6 flex-col items-center gap-1.5">
        <div className="w-full flex items-center gap-3 text-xs font-mono">
          <span className="w-12 text-right font-semibold text-accent-lime">
            {startTimeStr}
          </span>
          
          <div
            suppressHydrationWarning
            className="relative flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden cursor-pointer group"
            title={`${Math.round(mounted ? progressPercent : 0)}% through show (${startTimeStr} – ${endTimeStr})`}
          >
            <div
              suppressHydrationWarning
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-accent-purple via-purple-500 to-accent-lime rounded-full transition-all duration-1000 ease-linear shadow-sm shadow-accent-lime/40"
              style={{ width: `${mounted ? progressPercent.toFixed(2) : 0}%` }}
            />
          </div>

          <span className="w-12 text-left font-semibold text-zinc-400">
            {endTimeStr}
          </span>
        </div>
      </div>

      {/* 3. Right: Action Controls (Play, Ducking Quip, Volume) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 justify-end">
        <button
          onClick={() => triggerVoiceQuip()}
          disabled={isDucking || isGeneratingVoice}
          title="Trigger Host Voice Drop"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            isGeneratingVoice
              ? "bg-accent-purple text-foreground animate-pulse"
              : isDucking
              ? "bg-accent-lime text-background ring-2 ring-accent-lime/40 animate-pulse"
              : "bg-zinc-900 text-foreground hover:bg-zinc-800 border border-zinc-700"
          }`}
        >
          <Sparkles size={13} className={isDucking ? "text-background shrink-0" : "text-accent-lime shrink-0"} />
          <span className="hidden sm:inline">
            {isGeneratingVoice
              ? "Synthesizing AI..."
              : isDucking
              ? "Speaking (Duck)..."
              : "Trigger DJ Quip"}
          </span>
          <span className="sm:hidden text-[11px] font-bold">
            {isGeneratingVoice ? "AI..." : isDucking ? "On-Air" : "DJ Quip"}
          </span>
        </button>

        <div className="flex items-center">
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-accent-lime text-background flex items-center justify-center hover:scale-105 transition-transform cursor-pointer shadow-lg shadow-accent-lime/10"
          >
            {isPlaying ? (
              <Pause size={17} className="fill-current" />
            ) : (
              <Play size={17} className="fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Volume controls for desktop / tablet */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="text-zinc-400 hover:text-foreground transition-colors cursor-pointer"
          >
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 lg:w-20 h-1 bg-zinc-800 accent-accent-lime rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </footer>
  );
}
