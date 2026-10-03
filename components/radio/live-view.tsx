import React, { useState, useEffect } from "react";
import { stationBible } from "@/lib/data/station";
import { useAudioPlayer } from "../audio-context";
import { Radio, PhoneCall, Sparkles, Newspaper, Trophy, Navigation, Clock } from "lucide-react";

interface TrafficIncident {
  id: string;
  road: string;
  description: string;
  from?: string;
  to?: string;
  delayMinutes: number;
}

export function LiveView() {
  const {
    currentShow,
    triggerVoiceQuip,
    isDucking,
    isGeneratingVoice,
    activeSpeaker,
    isPlaying,
    isBulletinPlaying,
    triggerHourlyBulletin,
  } = useAudioPlayer();
  const [selectedCallerTag, setSelectedCallerTag] = useState<string>("THE_ZEF");

  // Real TomTom Telemetry State
  const [trafficIncidents, setTrafficIncidents] = useState<TrafficIncident[]>([]);
  const [isLoadingTraffic, setIsLoadingTraffic] = useState(false);
  const [trafficQueried, setTrafficQueried] = useState(false);

  const callers = stationBible.callers;
  const selectedCaller = callers.find((c) => c.voiceTag === selectedCallerTag) || callers[0];

  const refreshTraffic = async () => {
    setIsLoadingTraffic(true);
    try {
      const res = await fetch("/api/radio/traffic");
      if (res.ok) {
        const data = await res.json();
        setTrafficIncidents(data.incidents || []);
      }
    } catch {
      setTrafficIncidents([]);
    } finally {
      setIsLoadingTraffic(false);
      setTrafficQueried(true);
    }
  };

  useEffect(() => {
    refreshTraffic();
  }, []);

  const handleTrafficDesk = () => {
    const incidentText =
      trafficIncidents.length > 0
        ? trafficIncidents
            .map(
              (i) =>
                `${i.road}: ${i.description}${
                  i.delayMinutes > 0 ? ` (+${i.delayMinutes} min delay)` : ""
                }`
            )
            .join(". ")
        : undefined;

    triggerVoiceQuip("simon-carter", {
      type: "traffic",
      topic: incidentText,
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
            {/* Subtle, calm on-air status indicator (no rapid flashing) */}
            <span className="w-2 h-2 rounded-full bg-[#CCFF00] opacity-80" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#CCFF00]">
              LIVE ON AIR — 98.4 FM
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-heading)]">
            {currentShow.title}
          </h1>
          <p className="text-sm text-[#9CA3AF]">
            Broadcasting to Pretoria, Johannesburg, Brits, and the Vaal Triangle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-black/50 border border-white/10 text-right">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] block">HOST ON MIC</span>
            <span className="text-sm font-bold text-[#CCFF00]">{currentShow.hostNames}</span>
          </div>
        </div>
      </div>

      {/* Top-of-the-Hour Broadcast Bulletin Master Card */}
      <div className="p-6 rounded-2xl bg-[#141416] border border-[#27272A] space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#CCFF00]" />
              <h2 className="text-lg font-bold text-[#F3F4F6] font-[family-name:var(--font-heading)]">
                Top-of-the-Hour Broadcast Bulletin
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/20 font-bold uppercase">
                NewsAPI • TomTom • Weather
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF] max-w-2xl">
              Fires automatically at :00 on the station schedule, or test on-demand below. Real factual South African headlines with a sharp libertarian take, targeted sports (Rugby, Football, Cricket), and live TomTom highway incident telemetry.
            </p>
          </div>

          <button
            onClick={() => triggerHourlyBulletin()}
            disabled={isBulletinPlaying || isGeneratingVoice}
            className={`py-3 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50 shrink-0 ${
              isBulletinPlaying
                ? "bg-[#CCFF00] text-black ring-2 ring-[#CCFF00]/50 animate-pulse"
                : isGeneratingVoice
                ? "bg-[#7C3AED] text-white animate-pulse"
                : "bg-[#CCFF00] text-black hover:bg-[#b8e600] shadow-[#CCFF00]/10"
            }`}
          >
            <Sparkles size={15} />
            <span>
              {isBulletinPlaying
                ? "Broadcasting Bulletin Live..."
                : isGeneratingVoice
                ? "Synthesizing NewsAPI & TomTom..."
                : "Air Top-of-Hour Bulletin Now"}
            </span>
          </button>
        </div>

        {/* 3 Anchor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* 1. Gavin Stone */}
          <div className="p-4 rounded-xl bg-[#1A1A1E] border border-[#2A2A30] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper size={16} className="text-[#CCFF00]" />
                <h4 className="text-sm font-bold text-[#F3F4F6]">Gavin Stone</h4>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                News & Weather
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Reports real SA headlines (healthcare, economy, state spending) with dry libertarian scepticism of bureaucratic waste. Delivers live Gauteng weather.
            </p>
          </div>

          {/* 2. Gary Miller */}
          <div className="p-4 rounded-xl bg-[#1A1A1E] border border-[#2A2A30] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-[#9055FF]" />
                <h4 className="text-sm font-bold text-[#F3F4F6]">Gary Miller</h4>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                Sport
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Roy Keane-style cynical punditry. Covers Springboks, Vodacom Bulls (URC), Premier League, Man United, Barca, and Proteas. Zero American sports.
            </p>
          </div>

          {/* 3. Simon Carter */}
          <div className="p-4 rounded-xl bg-[#1A1A1E] border border-[#2A2A30] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation size={16} className="text-[#F59E0B]" />
                <h4 className="text-sm font-bold text-[#F3F4F6]">Simon Carter</h4>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                Traffic Desk
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Studio traffic desk anchor. High-stakes Tom Cruise intensity tracking live TomTom delays across the R59, N1, N12, R24, R21, N3, N4, and M1.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Simon Carter's Studio Traffic Desk */}
        <div className="p-5 rounded-2xl bg-[#141414] border border-[#232326] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation size={18} className="text-[#CCFF00]" />
                <h3 className="text-base font-bold text-[#F3F4F6] font-[family-name:var(--font-heading)]">
                  Simon Carter&apos;s Traffic Desk
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/20 font-bold">
                TOMTOM LIVE
              </span>
            </div>

            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Stationed at the studio traffic console monitoring live telemetry across the R59, N1, N12, R24, R21, N3, N4, and M1.
            </p>

            {/* Real Telemetry Status: Clean display, zero fake cards */}
            <div className="space-y-2 pt-1">
              {isLoadingTraffic && !trafficQueried ? (
                <div className="p-3.5 rounded-xl bg-[#18181A] border border-[#27272A] text-xs text-[#9CA3AF] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse" />
                  <span>Checking live TomTom telemetry...</span>
                </div>
              ) : trafficIncidents.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-[#18181A] border border-[#27272A] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#CCFF00] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]" />
                      Corridors Clear
                    </span>
                    <button
                      onClick={refreshTraffic}
                      disabled={isLoadingTraffic}
                      className="text-[10px] text-[#9CA3AF] hover:text-[#CCFF00] transition-colors cursor-pointer"
                    >
                      {isLoadingTraffic ? "Checking..." : "Refresh"}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                    Zero active incident delays reported on the telemetry grid across the R59, N1, N12, R24, R21, N3, N4, or M1.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[10px] font-mono uppercase text-[#A1A1AA]">
                      Active Delays ({trafficIncidents.length})
                    </span>
                    <button
                      onClick={refreshTraffic}
                      disabled={isLoadingTraffic}
                      className="text-[10px] text-[#9CA3AF] hover:text-[#CCFF00] transition-colors cursor-pointer"
                    >
                      {isLoadingTraffic ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>
                  {trafficIncidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="p-2.5 rounded-lg bg-[#1C1C1E] border border-[#27272A] text-xs space-y-1"
                    >
                      <div className="flex justify-between font-semibold text-[#F3F4F6]">
                        <span className="truncate">{incident.road}</span>
                        {incident.delayMinutes > 0 && (
                          <span className="text-amber-400 font-mono text-[11px] shrink-0 ml-2">
                            +{incident.delayMinutes} min
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#A1A1AA] line-clamp-2">
                        {incident.description}
                        {incident.from && incident.to ? ` (${incident.from} → ${incident.to})` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleTrafficDesk}
            disabled={isDucking || isGeneratingVoice}
            className="w-full py-2.5 px-4 rounded-xl bg-[#CCFF00] text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#b8e600] transition-colors cursor-pointer shadow-lg shadow-[#CCFF00]/10 disabled:opacity-50"
          >
            <Navigation size={15} />
            <span>
              {isGeneratingVoice
                ? "Connecting to Traffic Desk..."
                : isDucking && activeSpeaker?.includes("Simon")
                ? "Simon Carter On-Air..."
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
