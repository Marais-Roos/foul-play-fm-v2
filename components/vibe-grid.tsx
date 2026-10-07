"use client";

import React from "react";
import { HandMetal, Bot, Truck, Sunrise, Moon, Zap } from "lucide-react";
import { useAudioPlayer } from "./audio-context";
import { stationBible } from "@/lib/data/station";

interface VibeItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  showId: string;
}

const VIBE_CATEGORIES: VibeItem[] = [
  {
    id: "rock",
    label: "Rock",
    icon: HandMetal,
    showId: "rush-hour-rants",
  },
  {
    id: "conspiracy",
    label: "Conspiracy",
    icon: Bot,
    showId: "the-tin-foil-takeover",
  },
  {
    id: "trucker",
    label: "Trucker Tales",
    icon: Truck,
    showId: "truckers-tales-tacky-talk",
  },
  {
    id: "morning",
    label: "Morning Talk",
    icon: Sunrise,
    showId: "morning-madness",
  },
  {
    id: "latenight",
    label: "Late Night",
    icon: Moon,
    showId: "after-dark-descent",
  },
  {
    id: "erratic",
    label: "Erratic",
    icon: Zap,
    showId: "midday-mayhem",
  },
];

export function VibeGrid() {
  const { selectShow, triggerVoiceQuip } = useAudioPlayer();

  const handleVibeClick = (vibe: VibeItem) => {
    const matchingShow = stationBible.shows.find((s) => s.id === vibe.showId);
    if (matchingShow) {
      selectShow(matchingShow);
      const hostId = matchingShow.hostIds[0];
      triggerVoiceQuip(hostId);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight text-foreground font-heading">
        Browse by Vibe
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {VIBE_CATEGORIES.map((vibe) => {
          const Icon = vibe.icon;
          return (
            <button
              key={vibe.id}
              onClick={() => handleVibeClick(vibe)}
              className="flex items-center gap-3.5 p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 transition-all border border-zinc-800 hover:border-zinc-700 text-left group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-zinc-800 text-accent-lime group-hover:scale-110 transition-transform">
                <Icon size={22} className="stroke-[2.2]" />
              </div>
              <span className="text-sm font-semibold text-foreground group-hover:text-accent-lime transition-colors font-heading">
                {vibe.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
