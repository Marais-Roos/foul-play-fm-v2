"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Clock, Music, Disc3, Radio } from "lucide-react";
import { useAudioPlayer } from "./audio-context";

export function RecentlyPlayed() {
  const { playlist, recentlyPlayed, currentTrack, currentShow, isPlaying } = useAudioPlayer();

  // Show recently played tracks with their air start time
  const displayTracks = useMemo(() => {
    let list: typeof playlist = [];

    // If currently playing a track, display it at the top with "On Air"
    if (currentTrack && isPlaying) {
      list.push(currentTrack);
    }

    // Append recently played tracks that aren't already in list
    for (const t of recentlyPlayed) {
      if (!list.some((item) => item.id === t.id)) {
        list.push(t);
      }
    }

    // If nothing has played yet, fallback to playlist rotation
    if (list.length === 0) {
      list = playlist.slice(0, 6);
    }

    // Assign air start time for each track if not already stamped
    const now = new Date();
    return list.slice(0, 7).map((track, idx) => {
      if (track.playedAt) {
        return track;
      }
      // Calculate realistic airtime based on position
      const minutesAgo = idx * 4;
      const trackDate = new Date(now.getTime() - minutesAgo * 60 * 1000);
      const hours = trackDate.getHours().toString().padStart(2, "0");
      const mins = trackDate.getMinutes().toString().padStart(2, "0");
      return {
        ...track,
        playedAt: `${hours}:${mins}`,
      };
    });
  }, [currentTrack, isPlaying, recentlyPlayed, playlist]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-[#F3F4F6] font-[family-name:var(--font-heading)]">
          {recentlyPlayed.length > 0 ? "Recently Played" : "Show Playlist Rotation"}
        </h2>
        {currentShow?.jellyfinPlaylistId && (
          <span className="text-[11px] font-mono text-[#CCFF00] bg-[#CCFF00]/10 border border-[#CCFF00]/20 px-2 py-0.5 rounded">
            Jellyfin Synced
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {displayTracks.map((track, idx) => {
          const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;

          return (
            <div
              key={`${track.id}-${idx}`}
              className={`flex items-center justify-between p-2.5 px-3 rounded-xl transition-all border cursor-pointer group ${
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
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-[#CCFF00] text-black">
                        On Air
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#9CA3AF] truncate">
                    {track.artist} {track.album ? `• ${track.album}` : ""}
                  </span>
                </div>
              </div>

              {/* Right: Air Start Time */}
              <div
                className="flex items-center gap-1.5 text-xs font-mono shrink-0 pl-2"
                title={track.durationFormatted ? `Started at ${track.playedAt} (Duration: ${track.durationFormatted})` : `Started at ${track.playedAt}`}
              >
                <Clock
                  size={13}
                  className={isCurrentlyPlaying ? "text-[#CCFF00] animate-pulse" : "text-[#71717A] group-hover:text-[#CCFF00] transition-colors"}
                />
                <span
                  className={isCurrentlyPlaying ? "text-[#CCFF00] font-bold" : "text-[#9CA3AF] group-hover:text-[#F3F4F6] transition-colors"}
                >
                  {track.playedAt}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
