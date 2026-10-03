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
      <h2 className="text-2xl font-bold tracking-tight text-[#F3F4F6] font-[family-name:var(--font-heading)]">
        Browse by Vibe
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {VIBE_CATEGORIES.map((vibe) => {
          const Icon = vibe.icon;
          return (
            <button
              key={vibe.id}
              onClick={() => handleVibeClick(vibe)}
              className="flex items-center gap-3.5 p-4 rounded-xl bg-[#181818] hover:bg-[#222222] transition-all border border-[#232326] hover:border-[#38383E] text-left group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-[#242426] text-[#CCFF00] group-hover:scale-110 transition-transform">
                <Icon size={22} className="stroke-[2.2]" />
              </div>
              <span className="text-sm font-semibold text-[#F3F4F6] group-hover:text-[#CCFF00] transition-colors font-[family-name:var(--font-heading)]">
                {vibe.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
