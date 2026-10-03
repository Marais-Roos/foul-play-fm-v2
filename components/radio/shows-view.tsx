"use client";

import React from "react";
import { ShowCard } from "../show-card";
import { stationBible } from "@/lib/data/station";

interface ShowsViewProps {
  shows?: any[];
}

export function ShowsView({ shows }: ShowsViewProps) {
  const displayShows = shows && shows.length > 0 ? shows : stationBible.shows;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#F3F4F6] font-[family-name:var(--font-heading)]">
          24-Hour Programming Schedule
        </h1>
        <p className="text-sm text-[#9CA3AF]">
          Daily broadcast blocks synced from Sanity CMS. Click any show to tune in.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayShows.map((show, idx) => (
          <div key={show._id || show.id || idx} className="flex flex-col gap-2">
            <ShowCard show={show} index={idx} />
            <div className="p-3 rounded-xl bg-[#141414] border border-[#232326] space-y-2">
              <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                <span className="font-mono text-[#CCFF00] font-bold">
                  {typeof show.timeSlot === "number"
                    ? `${show.timeSlot.toString().padStart(2, "0")}:00 – ${((show.timeSlot + 3) % 24).toString().padStart(2, "0")}:00`
                    : show.timeSlot?.start
                    ? `${show.timeSlot.start} – ${show.timeSlot.end}`
                    : "00:00"}
                </span>
                {show.vibe && (
                  <span className="px-2 py-0.5 rounded bg-[#242426] text-[10px] uppercase font-semibold text-[#A1A1AA]">
                    {show.vibe}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9CA3AF] line-clamp-2">
                {show.description || show.shortDescription}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
