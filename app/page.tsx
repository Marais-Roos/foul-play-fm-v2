"use client";

import React, { useState } from "react";
import { AudioPlayerProvider, useAudioPlayer } from "@/components/audio-context";
import { Sidebar } from "@/components/sidebar";
import { AudioPlayerBar } from "@/components/player/audio-player-bar";
import { ShowCard } from "@/components/show-card";
import { RecentlyPlayed } from "@/components/recently-played";
import { VibeGrid } from "@/components/vibe-grid";
import { ShowsView } from "@/components/radio/shows-view";
import { PresentersView } from "@/components/radio/presenters-view";
import { LiveView } from "@/components/radio/live-view";
import { useSanityStation } from "@/lib/hooks/useSanityStation";

function StationMainContent() {
  const [activeTab, setActiveTab] = useState("home");
  const { currentShow } = useAudioPlayer();
  const { shows, presenters, source, isLoading } = useSanityStation();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0A0A] text-[#F3F4F6]">
      {/* 1. Spotify-Style Left Sidebar */}
      <Sidebar currentTab={activeTab} onTabChange={setActiveTab} />

      {/* 2. Main Scrollable Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto px-8 py-6 space-y-8 pb-32">
          {activeTab === "home" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Header: Explore Shows */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight text-[#F3F4F6] font-[family-name:var(--font-heading)]">
                      Explore Shows
                    </h1>
                    {source === "sanity" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#CCFF00]/15 text-[#CCFF00] font-mono font-bold border border-[#CCFF00]/30">
                        Sanity Live
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setActiveTab("shows")}
                    className="text-xs font-semibold text-[#9CA3AF] hover:text-[#CCFF00] transition-colors cursor-pointer"
                  >
                    View All Shows →
                  </button>
                </div>

                {/* Horizontal Shows Carousel populated from Sanity */}
                <div className="flex gap-5 overflow-x-auto pb-4 pt-1 scrollbar-none">
                  {shows.map((show, idx) => (
                    <ShowCard key={show._id || show.id || idx} show={show} index={idx} />
                  ))}
                </div>
              </div>

              {/* Lower Two-Column Section: Recently Played & Browse by Vibe */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                <RecentlyPlayed />
                <VibeGrid />
              </div>
            </div>
          )}

          {activeTab === "shows" && <ShowsView shows={shows} />}
          {activeTab === "presenters" && <PresentersView presenters={presenters} />}
          {activeTab === "live" && <LiveView />}
        </main>
      </div>

      {/* 3. Bottom Persistent Audio Player Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <AudioPlayerBar />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AudioPlayerProvider>
      <StationMainContent />
    </AudioPlayerProvider>
  );
}
