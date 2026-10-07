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
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-background border-r border-zinc-900 flex flex-col justify-between p-4 select-none
          transition-all duration-300 ease-in-out
          md:static md:translate-x-0 md:z-auto
          ${isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
          ${isCollapsed ? "md:w-20 md:p-3" : "md:w-60 md:p-4"}
          w-64 shrink-0
        `}
      >
        {/* Top: Logo & Navigation */}
        <div className="space-y-6">
          {/* Desktop Collapsed Header: Mini station emblem & expand toggle */}
          <div
            className={`hidden ${
              isCollapsed ? "md:flex flex-col items-center gap-3 pt-1" : "md:hidden"
            }`}
          >
            <button
              onClick={() => onTabChange("home")}
              title="Foul Play FM - Home"
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-zinc-900 to-background border border-accent-lime/40 flex items-center justify-center cursor-pointer hover:border-accent-lime hover:scale-105 transition-all shadow-md shadow-accent-lime/5"
            >
              <Radio size={22} className="text-accent-lime" />
            </button>

            <button
              onClick={onToggleCollapse}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="p-2 text-zinc-400 hover:text-accent-lime hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
            >
              <PanelLeftOpen size={18} />
            </button>
          </div>

          {/* Desktop Expanded Header OR Mobile Drawer Header */}
          <div
            className={`flex items-center justify-between pt-1 px-1 ${
              isCollapsed ? "md:hidden" : "flex"
            }`}
          >
            <div
              className="cursor-pointer flex items-center"
              onClick={() => {
                onTabChange("home");
                onCloseMobile?.();
              }}
            >
              <div className="relative w-36 h-11">
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

            {/* Desktop Collapse Toggle */}
            <button
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="hidden md:flex p-1.5 text-zinc-400 hover:text-accent-lime hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
            >
              <PanelLeftClose size={18} />
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              title="Close menu"
              aria-label="Close menu"
              className="md:hidden p-1.5 text-zinc-400 hover:text-foreground hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
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
                  className={`w-full flex items-center rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isCollapsed
                      ? "md:justify-center md:px-0 md:py-2.5 px-3 py-2.5 gap-3.5"
                      : "px-3 py-2.5 gap-3.5"
                  } ${
                    isActive
                      ? "bg-accent-lime/10 text-accent-lime border border-accent-lime/20 shadow-sm shadow-accent-lime/10"
                      : "text-zinc-400 hover:text-foreground hover:bg-zinc-900/60"
                  }`}
                >
                  <div className="relative shrink-0">
                    <Icon
                      size={20}
                      className={isActive ? "text-accent-lime" : "text-zinc-400"}
                    />
                  </div>
                  <span className={isCollapsed ? "md:hidden truncate" : "truncate"}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: Mini Controls */}
        <div
          className={`pt-4 border-t border-zinc-900 flex items-center ${
            isCollapsed
              ? "md:flex-col md:justify-center md:gap-3 md:px-0 flex-row gap-4 px-2"
              : "flex-row gap-4 px-2"
          }`}
        >
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause" : "Play"}
            className="text-foreground hover:text-accent-lime transition-colors cursor-pointer p-1"
          >
            {isPlaying ? (
              <Pause size={20} className="fill-current" />
            ) : (
              <Play size={20} className="fill-current" />
            )}
          </button>

          <button
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            title={isMuted ? "Unmute" : "Mute"}
            className="text-zinc-400 hover:text-foreground transition-colors cursor-pointer p-1"
          >
            {isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
        </div>
      </aside>
    </>
  );
}
