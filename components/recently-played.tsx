"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Clock, Disc3, History, Radio } from "lucide-react";
import { useAudioPlayer } from "./audio-context";

export function RecentlyPlayed() {
  const { recentlyPlayed, currentTrack, currentShow, isPlaying } = useAudioPlayer();

  // Genuine Broadcast History: Only tracks that ACTUALLY played on air
  const historyTracks = useMemo(() => {
    const list: typeof recentlyPlayed = [];

    // If currently playing a track on air, show it at the very top with "On Air"
    if (currentTrack && isPlaying) {
      const now = new Date();
      const timeStr = currentTrack.playedAt || `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      list.push({
        ...currentTrack,
        playedAt: timeStr,
        showTitle: currentTrack.showTitle || currentShow?.title,
      });
    }

    // Append genuinely recorded past tracks (avoid duplicate of currently playing track)
    for (const t of recentlyPlayed) {
      if (!list.some((item) => item.id === t.id)) {
        list.push(t);
      }
    }

    return list.slice(0, 15);
  }, [currentTrack, isPlaying, recentlyPlayed, currentShow?.title]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-2xl font-bold tracking-tight text-[#F3F4F6] font-[family-name:var(--font-heading)]">
            Recently Played
          </h2>
          {historyTracks.length > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/20 font-bold">
              {historyTracks.length}
            </span>
          )}
        </div>

        {isPlaying && currentTrack && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#CCFF00] bg-[#CCFF00]/10 border border-[#CCFF00]/20 px-2 py-0.5 rounded">
            <Radio size={11} className="animate-pulse" />
            Live Broadcast
          </span>
        )}
      </div>

      {/* History Track List */}
      {historyTracks.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#141416] border border-[#232326] text-center space-y-3">
          <History size={26} className="mx-auto text-[#71717A]" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#F3F4F6]">No Broadcast History Yet</p>
            <p className="text-xs text-[#9CA3AF] max-w-sm mx-auto leading-relaxed">
              Tracks will appear here with their exact air times as they are broadcast live on Foul Play FM. Press Play on the player to tune in!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {historyTracks.map((track, idx) => {
            const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;

            return (
              <div
                key={`${track.id}-${idx}`}
                className={`flex items-center justify-between p-2.5 px-3 rounded-xl transition-all border group ${
                  isCurrentlyPlaying
                    ? "bg-[#1A2210] border-[#CCFF00]/50 shadow-md shadow-[#CCFF00]/5"
                    : "bg-[#141416] hover:bg-[#1C1C20] border-[#232326]"
                }`}
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-10 h-10 rounded-md overflow-hidden bg-[#242428] shrink-0 border border-[#333] flex items-center justify-center">
                    {track.albumArtUrl ? (
                      <Image
                        src={track.albumArtUrl}
                        alt={track.title}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <Disc3
                        size={18}
                        className={isCurrentlyPlaying ? "text-[#CCFF00] animate-spin" : "text-[#71717A]"}
                      />
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold truncate transition-colors ${
                          isCurrentlyPlaying
                            ? "text-[#CCFF00]"
                            : "text-[#F3F4F6] group-hover:text-[#CCFF00]"
                        }`}
                      >
                        {track.title}
                      </span>
                      {isCurrentlyPlaying && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-[#CCFF00] text-black shrink-0">
                          On Air
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF] truncate">
                      <span className="truncate">
                        {track.artist} {track.album ? `• ${track.album}` : ""}
                      </span>
                      {track.showTitle && (
                        <span className="text-[10px] text-[#A1A1AA] bg-zinc-800/80 px-1.5 py-0.2 rounded shrink-0 font-medium">
                          {track.showTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Real Air Start Time */}
                <div
                  className="flex items-center gap-1.5 text-xs font-mono shrink-0 pl-2"
                  title={
                    track.durationFormatted
                      ? `Aired at ${track.playedAt} (Duration: ${track.durationFormatted})`
                      : `Aired at ${track.playedAt}`
                  }
                >
                  <Clock
                    size={13}
                    className={
                      isCurrentlyPlaying
                        ? "text-[#CCFF00] animate-pulse"
                        : "text-[#71717A] group-hover:text-[#CCFF00] transition-colors"
                    }
                  />
                  <span
                    className={
                      isCurrentlyPlaying
                        ? "text-[#CCFF00] font-bold"
                        : "text-[#9CA3AF] group-hover:text-[#F3F4F6] transition-colors"
                    }
                  >
                    {track.playedAt || "--:--"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
