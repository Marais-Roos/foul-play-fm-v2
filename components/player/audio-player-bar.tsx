"use client";

import React from "react";
import Image from "next/image";
import { Play, Pause, Volume2, VolumeX, Radio, Sparkles, Mic, Disc3, SkipForward } from "lucide-react";
import { urlForImage } from "@/sanity/lib/image";
import { useAudioPlayer } from "../audio-context";

export function AudioPlayerBar() {
  const {
    isPlaying,
    togglePlay,
    skipTrack,
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
    elapsedSeconds,
    totalShowSeconds,
    triggerVoiceQuip,
  } = useAudioPlayer();

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalShowSeconds) * 100));

  // Pull Sanity cover image if present
  const sanityImageUrl = (currentShow as any).coverImage
    ? urlForImage((currentShow as any).coverImage)?.width(120).height(120).url()
    : null;

  return (
    <footer className="h-22 bg-[#090909] border-t border-[#1C1C1E] px-6 flex items-center justify-between z-50 select-none">
      {/* 1. Left: Current Show Info */}
      <div className="flex items-center gap-4 min-w-[280px]">
        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#181818] shrink-0 border border-[#27272A] flex items-center justify-center">
          {sanityImageUrl ? (
            <Image
              src={sanityImageUrl}
              alt={currentShow.title}
              fill
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
            <div className="absolute top-1 right-1 flex gap-0.5 items-end h-3 bg-black/60 px-1 py-0.5 rounded">
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
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/20">
              <Radio size={10} className="animate-pulse" />
              Live
            </span>
          </div>

          {currentTrack ? (
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
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#121214] border border-[#CCFF00]/50 text-[#F3F4F6] px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-2.5 shadow-2xl backdrop-blur-md z-50 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
            <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-ping shrink-0" />
            <span className="font-bold text-[#CCFF00] shrink-0">{activeSpeaker}:</span>
            <span className="text-[#F3F4F6] italic truncate max-w-[420px]">"{activeTranscript}"</span>
          </div>
        )}

        <div className="w-full flex items-center gap-3 text-xs text-[#9CA3AF] font-mono">
          <span className="w-12 text-right">{formatTime(elapsedSeconds)}</span>
          
          <div className="relative flex-1 h-1.5 bg-[#27272A] rounded-full overflow-hidden cursor-pointer group">
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#7C3AED] via-[#9055FF] to-[#CCFF00] rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="w-12 text-left">03:00</span>
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
