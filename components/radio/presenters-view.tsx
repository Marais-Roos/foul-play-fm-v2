"use client";

import React from "react";
import Image from "next/image";
import { useAudioPlayer } from "../audio-context";
import { urlForImage } from "@/sanity/lib/image";
import { stationBible } from "@/lib/data/station";
import { Volume2, User, Mic } from "lucide-react";

interface PresentersViewProps {
  presenters?: any[];
}

export function PresentersView({ presenters }: PresentersViewProps) {
  const { triggerVoiceQuip, activeSpeaker, isDucking, isGeneratingVoice } = useAudioPlayer();
  const displayPresenters = presenters && presenters.length > 0 ? presenters : stationBible.djs;
  const sideCharacters = stationBible.sideCharacters;

  return (
    <div className="space-y-12 animate-in fade-in duration-300">
      {/* 1. Main Presenters */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#F3F4F6] font-[family-name:var(--font-heading)]">
            Station Presenters (DJs)
          </h1>
          <p className="text-sm text-[#9CA3AF]">
            Synced with Sanity CMS <code className="text-[#CCFF00] font-mono text-xs">presenter</code> documents. Click any presenter to synthesize live on-air banter.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayPresenters.map((dj: any, idx: number) => {
            const isSpeaking = activeSpeaker === dj.name;
            const sanityImageUrl = dj.image ? urlForImage(dj.image)?.width(400).height(400).url() : null;
            const djId = dj.slug?.current || dj.slug || dj.id || `dj-${idx}`;

            return (
              <div
                key={dj._id || djId}
                className={`p-5 rounded-2xl bg-[#141414] border transition-all duration-200 flex flex-col justify-between gap-4 ${
                  isSpeaking
                    ? "border-[#CCFF00] bg-[#182010] shadow-lg shadow-[#CCFF00]/10"
                    : "border-[#232326] hover:border-[#333]"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar / Profile Image from Sanity */}
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#242426] border border-[#333] shrink-0 flex items-center justify-center">
                        {sanityImageUrl ? (
                          <Image
                            src={sanityImageUrl}
                            alt={dj.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <User size={22} className="text-[#9CA3AF]" />
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-[#F3F4F6] font-[family-name:var(--font-heading)]">
                          {dj.name}
                        </h3>
                        {dj.parodyOf && (
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30">
                            Parody of {dj.parodyOf}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => triggerVoiceQuip(djId)}
                      disabled={isDucking || isGeneratingVoice}
                      className={`p-2.5 rounded-full transition-all cursor-pointer disabled:opacity-50 ${
                        isSpeaking
                          ? "bg-[#CCFF00] text-black animate-pulse"
                          : "bg-[#222] text-[#F3F4F6] hover:bg-[#CCFF00] hover:text-black"
                      }`}
                      title={`Synthesize live dialogue for ${dj.name}`}
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>

                  <p className="text-xs text-[#9CA3AF] line-clamp-3 leading-relaxed">
                    {dj.bio || dj.description}
                  </p>

                  {/* AI Personality Prompt (voicePrompt) */}
                  {(dj.voicePrompt || dj.personality) && (
                    <div className="p-2.5 rounded-lg bg-[#0C0C0C] border border-[#222] text-[11px] space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#CCFF00] block">
                        AI Personality Prompt (voicePrompt)
                      </span>
                      <p className="text-[#A1A1AA] line-clamp-2 italic">
                        &quot;{dj.voicePrompt || dj.personality}&quot;
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#222] flex items-center justify-between text-[11px] text-[#71717A]">
                  <span className="font-mono text-xs truncate max-w-[160px]">
                    {dj.voiceSampleUrl || dj.voiceSampleFile?.split("/").pop() || "Audio Sample"}
                  </span>
                  <span className="font-semibold text-[#CCFF00]">Fish Audio Cloned</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Side Characters (Pundits, Reporters & Correspondents) */}
      <div className="space-y-4 pt-6 border-t border-[#1F1F23]">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#F3F4F6] font-[family-name:var(--font-heading)]">
            Side Characters & Correspondents
          </h2>
          <p className="text-sm text-[#9CA3AF]">
            8 specialized pundits and field reporters covering traffic, finance grifts, aura wellness, and municipal tenders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {sideCharacters.map((sc) => {
            const isSpeaking = activeSpeaker === sc.name;
            const hasVoiceId = Boolean(sc.fishAudioVoiceId);

            return (
              <div
                key={sc.id}
                className={`p-5 rounded-2xl bg-[#141414] border transition-all duration-200 flex flex-col justify-between gap-4 ${
                  isSpeaking
                    ? "border-[#7C3AED] bg-[#1A1226] shadow-lg shadow-[#7C3AED]/10"
                    : "border-[#232326] hover:border-[#333]"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-[#F3F4F6] font-[family-name:var(--font-heading)]">
                        {sc.name}
                      </h3>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30">
                        {sc.role}
                      </span>
                    </div>

                    <button
                      onClick={() => triggerVoiceQuip(sc.id, { type: "commentary" })}
                      disabled={isDucking || isGeneratingVoice}
                      className={`p-2.5 rounded-full transition-all cursor-pointer disabled:opacity-50 ${
                        isSpeaking
                          ? "bg-[#7C3AED] text-white animate-pulse"
                          : "bg-[#222] text-[#F3F4F6] hover:bg-[#7C3AED] hover:text-white"
                      }`}
                      title={`Synthesize live dialogue for ${sc.name}`}
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>

                  <p className="text-xs text-[#9CA3AF] line-clamp-3 leading-relaxed">
                    {sc.description}
                  </p>

                  <div className="p-2.5 rounded-lg bg-[#0C0C0C] border border-[#222] text-[11px] space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A78BFA] block">
                      Satirical Archetype
                    </span>
                    <p className="text-[#A1A1AA] line-clamp-2 italic">
                      &quot;{sc.recommendedPreviewText}&quot;
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#222] flex items-center justify-between text-[11px] text-[#71717A]">
                  <span className="font-mono text-xs truncate max-w-[120px]">
                    {sc.voiceSampleFile ? sc.voiceSampleFile.split("/").pop() : "Sample Pending"}
                  </span>
                  <span className={`font-semibold ${hasVoiceId ? "text-[#CCFF00]" : "text-amber-400"}`}>
                    {hasVoiceId ? "Cloned" : "Pending"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
