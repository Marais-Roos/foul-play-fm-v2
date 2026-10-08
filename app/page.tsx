"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
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
import { urlForImage } from "@/sanity/lib/image";
import { DEFAULT_SHOW_IMAGES, findMatchingShow } from "@/lib/data/station";

function StationMainContent() {
  const [activeTab, setActiveTab] = useState("home");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { currentShow, updateShowMetadata } = useAudioPlayer();
  const { shows, presenters, sideCharacters } = useSanityStation();

  // Restore desktop sidebar collapsed preference if saved
  useEffect(() => {
    try {
      const saved = localStorage.getItem("foulplay_sidebar_collapsed");
      if (saved !== null) {
        setIsSidebarCollapsed(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("foulplay_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Sync Sanity show metadata to currentShow when loaded
  useEffect(() => {
    if (shows.length > 0) {
      const match =
        findMatchingShow(currentShow.id, currentShow.title, shows) ||
        shows.find(
          (s: any) =>
            s._id === currentShow.id ||
            s.id === currentShow.id ||
            s.slug === currentShow.id ||
            s.title === currentShow.title
        );
      if (match) {
        const rawCoverImage =
          match.thumbnailWithOverlay ||
          match.imageWithOverlay ||
          match.coverImage ||
          match.thumbnailWithoutOverlay ||
          match.imageWithoutOverlay;
        const resolvedShowId = match.slug || match.id || currentShow.id;
        const coverImageUrl = rawCoverImage
          ? urlForImage(rawCoverImage)?.width(800).height(800).fit("crop").url()
          : (match.imageUrl || DEFAULT_SHOW_IMAGES[resolvedShowId] || DEFAULT_SHOW_IMAGES['truckers-tales-tacky-talk']);
        const hostIds = match.hosts?.map((h: any) => h.slug || h._id) || [];
        const hostNames = match.hosts?.map((h: any) => h.name).join(' & ');
        updateShowMetadata({
          id: resolvedShowId,
          title: match.title || currentShow.title,
          description: match.description || currentShow.description,
          vibe: match.vibe || currentShow.vibe,
          jellyfinPlaylistId: match.jellyfinPlaylistId || currentShow.jellyfinPlaylistId,
          coverImage: rawCoverImage,
          thumbnailWithOverlay: match.thumbnailWithOverlay || match.imageWithOverlay || match.coverImage,
          imageWithOverlay: match.thumbnailWithOverlay || match.imageWithOverlay || match.coverImage,
          thumbnailWithoutOverlay: match.thumbnailWithoutOverlay || match.imageWithoutOverlay,
          imageWithoutOverlay: match.thumbnailWithoutOverlay || match.imageWithoutOverlay,
          studioImage: match.studioImage,
          imageUrl: coverImageUrl || currentShow.imageUrl,
          hostIds: hostIds.length > 0 ? hostIds : currentShow.hostIds,
          hostNames: hostNames || currentShow.hostNames,
        });
      }
    }
  }, [shows, currentShow.id, currentShow.title, updateShowMetadata]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* 1. Spotify-Style Left Sidebar (collapsible desktop + drawer mobile) */}
      <Sidebar
        currentTab={activeTab}
        onTabChange={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Main Scrollable Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Header (only on < md screens) */}
        <header className="h-14 bg-background border-b border-zinc-900 px-4 flex items-center justify-between md:hidden shrink-0 z-30 select-none">
          <div
            className="relative w-32 h-8 cursor-pointer flex items-center"
            onClick={() => setActiveTab("home")}
          >
            <Image
              src="/images/logo.png"
              alt="Foul Play FM"
              fill
              sizes="128px"
              className="object-contain object-left"
              priority
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent-lime/10 text-accent-lime border border-accent-lime/20 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lime animate-pulse" />
              LIVE STREAM
            </span>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-6 space-y-6 md:space-y-8 pb-52 md:pb-36">
          {activeTab === "home" && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
              {/* Header: Explore Shows */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
                      Explore Shows
                    </h1>
                  </div>
                  <button
                    onClick={() => setActiveTab("shows")}
                    className="text-xs font-semibold text-zinc-400 hover:text-accent-lime transition-colors cursor-pointer"
                  >
                    View All Shows →
                  </button>
                </div>

                {/* Horizontal Shows Carousel populated from Sanity */}
                <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 scrollbar-none">
                  {shows.map((show, idx) => (
                    <ShowCard key={show._id || show.id || idx} show={show} index={idx} />
                  ))}
                </div>
              </div>

              {/* Lower Two-Column Section: Recently Played & Browse by Vibe */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 pt-2">
                <RecentlyPlayed />
                <VibeGrid />
              </div>
            </div>
          )}

          {activeTab === "shows" && <ShowsView shows={shows} />}
          {activeTab === "presenters" && <PresentersView presenters={presenters} sideCharacters={sideCharacters} />}
          {activeTab === "live" && <LiveView />}
        </main>
      </div>

      {/* 3. Bottom Persistent Audio Player Bar (stacked above bottom navbar on mobile) */}
      <div className="fixed bottom-[86px] md:bottom-0 left-0 right-0 z-40 md:z-50">
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
