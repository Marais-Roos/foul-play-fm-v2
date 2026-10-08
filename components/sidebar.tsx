"use client";

import React from "react";
import Image from "next/image";
import {
  Home,
  Disc3,
  Users,
  Radio,
  Play,
  Pause,
  Volume2,
  VolumeX,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useAudioPlayer } from "./audio-context";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  currentTab,
  onTabChange,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const { isPlaying, togglePlay, isMuted, toggleMute } = useAudioPlayer();

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "shows", label: "Shows", icon: Disc3 },
    { id: "presenters", label: "Presenters", icon: Users },
    { id: "live", label: "Live Now", icon: Radio },
  ];

  return (
    <>
      {/* ======================================================== */}
      {/* Desktop Sidebar: Exact Figma Navigation spec (md+ screens) */}
      {/* Closed: 72px, Open: 256px, #0A0A0A background, py-12 px-4 */}
      {/* ======================================================== */}
      <aside
        className={`
          hidden md:flex md:flex-col md:justify-between py-12 px-4 select-none
          bg-[#0A0A0A] border-r border-zinc-900/80 shrink-0
          transition-all duration-300 ease-out
          ${isCollapsed ? "md:w-[72px]" : "md:w-[256px]"}
        `}
      >
        {/* Top: Branding & Navigation Section */}
        <div className="flex flex-col">
          {/* 1. Collapsed Desktop Header (Frame 86: 40px icon + toggle) */}
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-12">
              {/* Foul Play FM Mini Emblem Logo (40x25.7px) */}
              <button
                onClick={() => onTabChange("home")}
                title="Foul Play FM - Home"
                aria-label="Foul Play FM Home"
                className="w-10 h-[26px] relative cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
              >
                <Image
                  src="/images/icon.svg"
                  alt="Foul Play FM"
                  fill
                  className="object-contain"
                  priority
                />
              </button>

              {/* Expand Sidebar Toggle (Frame 85: 40x40px, 300ms ease-out) */}
              <button
                onClick={onToggleCollapse}
                title="Expand sidebar"
                aria-label="Expand sidebar"
                className="w-10 h-10 flex items-center justify-center text-zinc-300 hover:text-[#CCFF00] hover:bg-white/5 rounded-[6px] transition-colors cursor-pointer focus:outline-none"
              >
                <PanelLeftOpen size={22} />
              </button>
            </div>
          ) : (
            /* 2. Expanded Desktop Header (Frame 135: wordmark + Frame 92: toggle & heading) */
            <div className="flex flex-col">
              {/* Wordmark Logo (Frame 135: 224x34.6px) */}
              <div
                className="cursor-pointer flex items-center w-[224px] h-[35px] relative hover:opacity-90 transition-opacity"
                onClick={() => onTabChange("home")}
              >
                <Image
                  src="/images/logo-wide.svg"
                  alt="Foul Play FM"
                  fill
                  sizes="224px"
                  className="object-contain object-left"
                  priority
                />
              </div>

              {/* Sub-header row (Frame 92: Toggle + "Explore the station") */}
              <div className="flex items-center gap-4 mt-6">
                <button
                  onClick={onToggleCollapse}
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                  className="w-10 h-10 flex items-center justify-center text-zinc-300 hover:text-[#CCFF00] hover:bg-white/5 rounded-[6px] transition-colors cursor-pointer shrink-0 focus:outline-none"
                >
                  <PanelLeftClose size={22} />
                </button>

                <span className="text-base font-semibold text-white tracking-tight select-none">
                  Explore the station
                </span>
              </div>
            </div>
          )}

          {/* 3. Navigation Menu Items (Frame 87: 24px gap between items) */}
          <nav className="mt-12 space-y-6 flex flex-col">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={item.label}
                  className={`
                    transition-all duration-200 cursor-pointer rounded-[6px] focus:outline-none
                    ${isCollapsed
                      ? "w-10 h-10 justify-center px-0 flex items-center"
                      : "w-full h-10 px-4 flex items-center gap-6"
                    }
                    ${isActive
                      ? "bg-[#CCFF00]/15"
                      : "bg-transparent hover:bg-white/5"
                    }
                  `}
                >
                  {/* Icon (24x24px, #CCFF00 brand color) */}
                  <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                    <Icon
                      size={24}
                      className={
                        isActive
                          ? "text-[#CCFF00]"
                          : "text-[#CCFF00]/80 hover:text-[#CCFF00] transition-colors"
                      }
                    />
                  </div>

                  {/* Label (18px Inter, Medium when active, Regular when default, White) */}
                  {!isCollapsed && (
                    <span
                      className={`text-lg text-white truncate ${isActive ? "font-medium" : "font-normal"
                        }`}
                    >
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Desktop Mini Audio Controls */}
        <div
          className={`pt-6 border-t border-zinc-900/60 flex items-center ${isCollapsed
            ? "flex-col justify-center gap-4 px-0"
            : "flex-row gap-4 px-2"
            }`}
        >
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause" : "Play"}
            className="w-9 h-9 flex items-center justify-center text-zinc-300 hover:text-[#CCFF00] hover:bg-white/5 rounded-[6px] transition-colors cursor-pointer focus:outline-none"
          >
            {isPlaying ? (
              <Pause size={20} className="fill-current" />
            ) : (
              <Play size={20} className="fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            title={isMuted ? "Unmute" : "Mute"}
            className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 rounded-[6px] transition-colors cursor-pointer focus:outline-none"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* Mobile Bottom Navbar (Figma Variant: Tablet/Mobile 155:2221) */}
      {/* Tied to the bottom, full width with 16px margin on each side */}
      {/* Height: 70px, bg: #0A0A0A/50, backdrop-blur: 15px, radius: 6px */}
      {/* Multi-layer drop shadow and 4 vertical icon+label tab buttons */}
      {/* ======================================================== */}
      <nav
        aria-label="Mobile navigation"
        className="
          md:hidden fixed bottom-3 left-4 right-4 z-50 h-[70px]
          bg-[#0A0A0A]/50 backdrop-blur-[15px] rounded-[6px]
          border border-white/10
          shadow-[0_3px_6px_rgba(0,0,0,0.1),0_10px_10px_rgba(0,0,0,0.09),0_23px_14px_rgba(0,0,0,0.05),0_41px_16px_rgba(0,0,0,0.01)]
          px-6 py-2 flex items-center justify-between select-none
        "
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                onCloseMobile?.();
              }}
              title={item.label}
              className={`
                flex flex-col items-center justify-center gap-1 min-w-[50px] py-1 cursor-pointer transition-opacity focus:outline-none
                ${isActive ? "opacity-100" : "opacity-50 hover:opacity-80"}
              `}
            >
              {/* Icon (24x24px, #CCFF00 brand color) */}
              <div className="w-6 h-6 flex items-center justify-center">
                <Icon size={24} className="text-[#CCFF00]" />
              </div>

              {/* Text label (8px Inter Regular, White) */}
              <span className="text-[8px] font-normal leading-tight text-white tracking-normal">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

