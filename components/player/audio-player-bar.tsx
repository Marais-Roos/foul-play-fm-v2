"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Play, Pause, Volume2, VolumeX, Radio, Sparkles, Mic, Disc3, SkipForward, Megaphone } from "lucide-react";
import { urlForImage } from "@/sanity/lib/image";
import { DEFAULT_SHOW_IMAGES, calculateShowProgress } from "@/lib/data/station";
import { useAudioPlayer } from "../audio-context";

export function AudioPlayerBar() {
  const {
    isPlaying,
    togglePlay,
    skipTrack,
    currentTrack,
    currentBroadcastItem,
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
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { startTimeStr, endTimeStr, progressPercent, isOnAir } = useMemo(() => {
    return calculateShowProgress(currentShow, now);
  }, [currentShow, now]);

  // Robust artwork thumbnail resolution:
  // 1. Sanity coverImage (uploaded crop)
  // 2. Direct show imageUrl property
  // 3. Official station CDN image fallback by show id/slug
  const thumbnailSrc =
    (currentShow.coverImage ? urlForImage(currentShow.coverImage)?.width(160).height(160).fit("crop").url() : null) ||
    currentShow.imageUrl ||
    DEFAULT_SHOW_IMAGES[currentShow.id] ||
    null;

  return (
    <footer className="h-22 bg-[#090909] border-t border-[#1C1C1E] px-6 flex items-center justify-between z-50 select-none">
      {/* 1. Left: Current Show Info */}
      <div className="flex items-center gap-4 min-w-[280px]">
        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#181818] shrink-0 border border-[#27272A] flex items-center justify-center">
          {thumbnailSrc ? (
            <Image
              src={thumbnailSrc}
              alt={currentShow.title}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#7C3AED]/30 to-[#CCFF00]/20 flex items-center justify-center">
              <Disc3
                size={26}
                className={`text-[#CCFF00] ${isPlaying ? "animate-[spin_4s_linear_infinite]" : ""}`}
              />
            </div>
          )}

          {isPlaying && (
            <div className="absolute top-1 right-1 flex gap-0.5 items-end h-3 bg-black/70 px-1 py-0.5 rounded shadow">
              <span className="w-0.5 bg-[#CCFF00] h-full animate-[bounce_0.8s_infinite]" />
              <span className="w-0.5 bg-[#CCFF00] h-2/3 animate-[bounce_0.6s_infinite]" />
              <span className="w-0.5 bg-[#CCFF00] h-4/5 animate-[bounce_1s_infinite]" />
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-[#F3F4F6] truncate font-[family-name:var(--font-heading)]">
              {currentShow.title}
            </h4>
            {isOnAir ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/20">
                <Radio size={10} className="animate-pulse" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700">
                Replay
              </span>
            )}
          </div>

          {currentBroadcastItem && currentBroadcastItem.type === "sweeper" ? (
            <p className="text-xs text-[#CCFF00] font-semibold truncate mt-0.5 flex items-center gap-1.5 animate-pulse">
              <Sparkles size={11} />
              <span>STATION SWEEPER</span>
              <span className="text-[#9CA3AF] font-normal">• {currentBroadcastItem.subtitle || "98.4 FM"}</span>
            </p>
          ) : currentBroadcastItem && currentBroadcastItem.type === "ad" ? (
            <p className="text-xs text-[#F59E0B] font-semibold truncate mt-0.5 flex items-center gap-1.5 animate-pulse">
              <Megaphone size={11} />
              <span>SPONSOR MESSAGE</span>
              <span className="text-[#9CA3AF] font-normal">• {currentBroadcastItem.subtitle || "Foul Play Commercial"}</span>
            </p>
          ) : currentBroadcastItem && currentBroadcastItem.type === "banter" ? (
            <p className="text-xs text-[#CCFF00] font-semibold truncate mt-0.5 flex items-center gap-1.5 animate-pulse">
              <Mic size={11} />
              <span>{activeSpeaker || currentShow.hostNames} ON AIR</span>
            </p>
          ) : currentTrack ? (
            <p className="text-xs text-[#E5E7EB] font-medium truncate mt-0.5">
              <span className="text-[#CCFF00]">♫</span> {currentTrack.title}{" "}
              <span className="text-[#9CA3AF] font-normal">• {currentTrack.artist}</span>
            </p>
          ) : (
            <p className="text-xs text-[#9CA3AF] truncate mt-0.5">
              {currentShow.hostNames}
            </p>
          )}

          {isDucking && activeSpeaker && (
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-[#CCFF00] animate-pulse">
              <Mic size={11} />
              <span>{activeSpeaker} on-air (Ducking Active)</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Center: Timeline & Progress Bar (with dynamic floating subtitle) */}
      <div className="relative flex-1 max-w-2xl px-6 flex flex-col items-center gap-1.5">
        {/* Floating Subtitle Banner */}
        {activeTranscript && (
          <div className="absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 bg-[#121214]/95 border border-[#CCFF00]/50 text-[#F3F4F6] px-4 py-2.5 rounded-2xl text-xs font-medium flex flex-col gap-1 shadow-2xl backdrop-blur-md z-50 max-w-[560px] w-max animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-ping shrink-0" />
              <span className="font-bold text-[#CCFF00] shrink-0 uppercase tracking-wider text-[11px]">
                {activeSpeaker} on-air:
              </span>
            </div>
            <div className="text-[#E4E4E7] text-xs font-sans whitespace-pre-line leading-relaxed max-h-[100px] overflow-y-auto">
              {activeTranscript}
            </div>
          </div>
        )}

        <div className="w-full flex items-center gap-3 text-xs font-mono">
          <span className="w-12 text-right font-semibold text-[#CCFF00]">
            {startTimeStr}
          </span>
          
          <div
            className="relative flex-1 h-2 bg-[#27272A] rounded-full overflow-hidden cursor-pointer group"
            title={`${Math.round(progressPercent)}% through show (${startTimeStr} – ${endTimeStr})`}
          >
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#7C3AED] via-[#9055FF] to-[#CCFF00] rounded-full transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(204,255,0,0.35)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="w-12 text-left font-semibold text-[#9CA3AF]">
            {endTimeStr}
          </span>
        </div>
      </div>

      {/* 3. Right: Action Controls (Play, Ducking Quip, Volume) */}
      <div className="flex items-center gap-4 min-w-[280px] justify-end">
        <button
          onClick={() => triggerVoiceQuip()}
          disabled={isDucking || isGeneratingVoice}
          title="Trigger Host Voice Drop"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            isGeneratingVoice
              ? "bg-[#7C3AED] text-white animate-pulse"
              : isDucking
              ? "bg-[#CCFF00] text-black ring-2 ring-[#CCFF00]/40 animate-pulse"
              : "bg-[#1C1C1E] text-[#F3F4F6] hover:bg-[#27272A] border border-[#2E2E32]"
          }`}
        >
          <Sparkles size={13} className={isDucking ? "text-black" : "text-[#CCFF00]"} />
          <span>
            {isGeneratingVoice
              ? "Synthesizing AI..."
              : isDucking
              ? "Speaking (Duck)..."
              : "Trigger DJ Quip"}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-[#CCFF00] text-black flex items-center justify-center hover:scale-105 transition-transform cursor-pointer shadow-lg shadow-[#CCFF00]/10"
          >
            {isPlaying ? (
              <Pause size={18} className="fill-current" />
            ) : (
              <Play size={18} className="fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={skipTrack}
            title="Next Track in Playlist"
            className="w-8 h-8 rounded-full bg-[#1C1C1E] text-[#9CA3AF] hover:text-[#CCFF00] hover:bg-[#27272A] border border-[#2E2E32] flex items-center justify-center transition-all cursor-pointer"
          >
            <SkipForward size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="text-[#9CA3AF] hover:text-[#F3F4F6] transition-colors cursor-pointer"
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
            className="w-20 h-1 bg-[#27272A] accent-[#CCFF00] rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </footer>
  );
}
