"use client";

import React from "react";
import Image from "next/image";
import { Home, Disc3, Users, Radio, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useAudioPlayer } from "./audio-context";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ currentTab, onTabChange }: SidebarProps) {
  const { isPlaying, togglePlay, isMuted, toggleMute } = useAudioPlayer();

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "shows", label: "Shows", icon: Disc3 },
    { id: "presenters", label: "Presenters", icon: Users },
    { id: "live", label: "Live Now", icon: Radio, isLive: true },
  ];

  return (
    <aside className="w-56 shrink-0 bg-[#070707] border-r border-[#181818] flex flex-col justify-between p-4 select-none">
      {/* Top: Logo & Nav */}
      <div className="space-y-8">
        {/* Foul Play FM Brand Logo */}
        <div className="pt-2 px-2 flex items-center gap-2 cursor-pointer" onClick={() => onTabChange("home")}>
          <div className="relative w-36 h-12">
            <Image
              src="/images/logo.png"
              alt="Foul Play FM"
              fill
              sizes="144px"
              className="object-contain object-left"
              priority
            />
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#182010] text-[#CCFF00]"
                    : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#121212]"
                }`}
              >
                <div className="relative">
                  <Icon
                    size={20}
                    className={isActive ? "text-[#CCFF00]" : "text-[#9CA3AF]"}
                  />
                  {item.isLive && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#CCFF00] rounded-full animate-ping" />
                  )}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Sidebar: Mini Controls as in Mockup */}
      <div className="pt-4 border-t border-[#181818] flex items-center gap-4 px-2">
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="text-[#F3F4F6] hover:text-[#CCFF00] transition-colors cursor-pointer"
        >
          {isPlaying ? (
            <Pause size={22} className="fill-current" />
          ) : (
            <Play size={22} className="fill-current" />
          )}
        </button>

        <button
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute" : "Mute"}
          className="text-[#9CA3AF] hover:text-[#F3F4F6] transition-colors cursor-pointer"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>
    </aside>
  );
}
