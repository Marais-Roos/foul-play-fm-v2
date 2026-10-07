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
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-heading">
            Recently Played
          </h2>
          {historyTracks.length > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-accent-lime/10 text-accent-lime border border-accent-lime/20 font-bold">
              {historyTracks.length}
            </span>
          )}
        </div>

        {isPlaying && currentTrack && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-accent-lime bg-accent-lime/10 border border-accent-lime/20 px-2 py-0.5 rounded">
            <Radio size={11} className="animate-pulse" />
            Live Broadcast
          </span>
        )}
      </div>

      {/* History Track List */}
      {historyTracks.length === 0 ? (
        <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-3">
          <History size={26} className="mx-auto text-zinc-500" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No Broadcast History Yet</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
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
                    ? "bg-accent-lime/10 border-accent-lime/50 shadow-md shadow-accent-lime/5"
                    : "bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800"
                }`}
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-10 h-10 rounded-md overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700 flex items-center justify-center">
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
                        className={isCurrentlyPlaying ? "text-accent-lime animate-spin" : "text-zinc-500"}
                      />
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold truncate transition-colors ${
                          isCurrentlyPlaying
                            ? "text-accent-lime"
                            : "text-foreground group-hover:text-accent-lime"
                        }`}
                      >
                        {track.title}
                      </span>
                      {isCurrentlyPlaying && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-accent-lime text-background shrink-0">
                          On Air
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
                      <span className="truncate">
                        {track.artist} {track.album ? `• ${track.album}` : ""}
                      </span>
                      {track.showTitle && (
                        <span className="text-[10px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.2 rounded shrink-0 font-medium">
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
                        ? "text-accent-lime animate-pulse"
                        : "text-zinc-500 group-hover:text-accent-lime transition-colors"
                    }
                  />
                  <span
                    className={
                      isCurrentlyPlaying
                        ? "text-accent-lime font-bold"
                        : "text-zinc-400 group-hover:text-foreground transition-colors"
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
