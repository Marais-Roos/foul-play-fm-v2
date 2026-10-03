"use client";

import React, { useState } from "react";
import { stationBible } from "@/lib/data/station";
import { useAudioPlayer } from "../audio-context";
import { Radio, Plane, PhoneCall, CloudRain, AlertTriangle, Play, Sparkles } from "lucide-react";

export function LiveView() {
  const { currentShow, triggerVoiceQuip, isDucking, isGeneratingVoice, activeSpeaker, isPlaying } = useAudioPlayer();
  const [selectedCallerTag, setSelectedCallerTag] = useState<string>("THE_ZEF");

  const callers = stationBible.callers;
  const selectedCaller = callers.find((c) => c.voiceTag === selectedCallerTag) || callers[0];

  const handleTrafficChopper = () => {
    triggerVoiceQuip("simon-carter", {
      type: "traffic",
      topic: "N1 Buccleuch interchange gridlock with minibus taxis dogfighting for the emergency lane"
    });
  };

  const handleCallerPatch = () => {
    triggerVoiceQuip(currentShow.hostIds[0], {
      type: "caller",
      callerId: selectedCallerTag,
      topic: selectedCaller.targetOfSatire,
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#182010] via-[#141414] to-[#120F1E] border border-[#27272A] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#CCFF00] animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#CCFF00]">
              LIVE ON AIR — 98.4 FM
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-heading)]">
            {currentShow.title}
          </h1>
          <p className="text-sm text-[#9CA3AF]">
            Broadcasting to Pretoria, Johannesburg, Brits, and the Vaal Basin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-black/50 border border-white/10 text-right">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] block">HOST ON MIC</span>
            <span className="text-sm font-bold text-[#CCFF00]">{currentShow.hostNames}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Simon Carter's Traffic Chopper Radar */}
        <div className="p-5 rounded-2xl bg-[#141414] border border-[#232326] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plane size={18} className="text-[#CCFF00]" />
                <h3 className="text-base font-bold text-[#F3F4F6] font-[family-name:var(--font-heading)]">
                  Chopper One Traffic Radar
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800/40">
                AIRBORNE
              </span>
            </div>

            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Simon Carter (&quot;Maverick&quot;) is flying an attack helicopter over the Buccleuch interchange dogfighting commuter taxis.
            </p>

            <div className="space-y-2 pt-2">
              <div className="p-2.5 rounded-lg bg-[#1C1C1E] border border-[#27272A] text-xs space-y-1">
                <div className="flex justify-between font-semibold text-[#F3F4F6]">
                  <span>N1 Buccleuch Gridlock</span>
                  <span className="text-red-400 font-mono">+55 min</span>
                </div>
                <p className="text-[11px] text-[#A1A1AA]">
                  All lanes blocked; commuters trading biltong.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#1C1C1E] border border-[#27272A] text-xs space-y-1">
                <div className="flex justify-between font-semibold text-[#F3F4F6]">
                  <span>M1 Double Decker</span>
                  <span className="text-amber-400 font-mono">+35 min</span>
                </div>
                <p className="text-[11px] text-[#A1A1AA]">
                  Scrap copper flatbed rolled over before Empire Rd.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleTrafficChopper}
            disabled={isDucking || isGeneratingVoice}
            className="w-full py-2.5 px-4 rounded-xl bg-[#CCFF00] text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#b8e600] transition-colors cursor-pointer shadow-lg shadow-[#CCFF00]/10 disabled:opacity-50"
          >
            <Plane size={15} />
            <span>
              {isGeneratingVoice
                ? "Calling Chopper One..."
                : isDucking && activeSpeaker?.includes("Simon")
                ? "Simon Carter Airborne..."
                : "Patch Simon Carter (Traffic Audio)"}
            </span>
          </button>
        </div>

        {/* 2. Live Caller Switchboard (25 Personas) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#141414] border border-[#232326] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneCall size={18} className="text-[#7C3AED]" />
                <h3 className="text-base font-bold text-[#F3F4F6] font-[family-name:var(--font-heading)]">
                  Live Listener Switchboard (25 Callers)
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30">
                LINE 4 RINGING
              </span>
            </div>

            <p className="text-xs text-[#9CA3AF]">
              Select a caller archetype to preview their dialogue and target of satire.
            </p>

            {/* Persona Selector Chips */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {callers.map((c) => (
                <button
                  key={c.voiceTag}
                  onClick={() => setSelectedCallerTag(c.voiceTag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedCallerTag === c.voiceTag
                      ? "bg-[#7C3AED] text-white shadow-md shadow-[#7C3AED]/20"
                      : "bg-[#1E1E22] text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#28282E]"
                  }`}
                >
                  {c.archetype}
                </button>
              ))}
            </div>

            {/* Selected Caller Details */}
            {selectedCaller && (
              <div className="p-3 rounded-xl bg-[#1C1C1E] border border-[#2E2E34] space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#CCFF00]">
                    {selectedCaller.archetype}
                  </span>
                  <span className="text-[11px] text-[#A1A1AA]">
                    Satire: {selectedCaller.targetOfSatire}
                  </span>
                </div>
                <p className="text-xs text-[#D1D5DB] italic">
                  &quot;{selectedCaller.recommendedPreviewText}&quot;
                </p>
                <p className="text-[11px] text-[#9CA3AF]">
                  Strategy: {selectedCaller.aiContextStrategy}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCallerPatch}
              disabled={isDucking || isGeneratingVoice}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#7C3AED] text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#6D28D9] transition-colors cursor-pointer shadow-lg shadow-[#7C3AED]/20 disabled:opacity-50"
            >
              <PhoneCall size={15} />
              <span>
                {isGeneratingVoice
                  ? "Patching Line 4..."
                  : isDucking
                  ? "Caller Live On Air..."
                  : `Patch ${selectedCaller.archetype} On-Air`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
