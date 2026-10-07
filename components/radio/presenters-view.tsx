"use client";

import React from "react";
import Image from "next/image";
import { useAudioPlayer } from "../audio-context";
import { urlForImage } from "@/sanity/lib/image";
import { stationBible } from "@/lib/data/station";
import { Volume2, User, Mic } from "lucide-react";

interface PresentersViewProps {
  presenters?: any[];
  sideCharacters?: any[];
}

export function PresentersView({ presenters, sideCharacters: propSideCharacters }: PresentersViewProps) {
  const { triggerVoiceQuip, activeSpeaker, isDucking, isGeneratingVoice } = useAudioPlayer();
  const displayPresenters = presenters && presenters.length > 0 ? presenters : stationBible.djs;
  const sideCharacters = propSideCharacters && propSideCharacters.length > 0 ? propSideCharacters : stationBible.sideCharacters;

  return (
    <div className="space-y-12 animate-in fade-in duration-300">
      {/* 1. Main Presenters */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">
            Station Presenters (DJs)
          </h1>
          <p className="text-sm text-zinc-400">
            Synced with Sanity CMS <code className="text-accent-lime font-mono text-xs">presenter</code> documents. Click any presenter to synthesize live on-air banter.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayPresenters.map((dj: any, idx: number) => {
            const isSpeaking = activeSpeaker === dj.name;
            const sanityImageUrl = (dj.thumbnailImage || dj.image)
              ? urlForImage(dj.thumbnailImage || dj.image)?.width(400).height(400).url()
              : null;
            const backdropUrl = dj.backdropImage
              ? urlForImage(dj.backdropImage)?.width(800).height(300).fit("crop").url()
              : null;
            const djId = dj.slug?.current || dj.slug || dj.id || `dj-${idx}`;

            return (
              <div
                key={dj._id || djId}
                className={`rounded-2xl bg-zinc-900/60 border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                  backdropUrl ? "p-0" : "p-5"
                } ${
                  isSpeaking
                    ? "border-accent-lime bg-accent-lime/10 shadow-lg shadow-accent-lime/10"
                    : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {backdropUrl && (
                  <div className="relative w-full h-24 overflow-hidden shrink-0">
                    <Image
                      src={backdropUrl}
                      alt={`${dj.name} backdrop`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                  </div>
                )}

                <div className={`space-y-3 ${backdropUrl ? "p-5 pt-2" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar / Profile Image from Sanity */}
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 shrink-0 flex items-center justify-center shadow-md">
                        {sanityImageUrl ? (
                          <Image
                            src={sanityImageUrl}
                            alt={dj.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <User size={22} className="text-zinc-400" />
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-foreground font-heading">
                          {dj.name}
                        </h3>
                        {dj.parodyOf && (
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-purple/20 text-purple-300 border border-accent-purple/30">
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
                          ? "bg-accent-lime text-background animate-pulse"
                          : "bg-zinc-800 text-foreground hover:bg-accent-lime hover:text-background"
                      }`}
                      title={`Synthesize live dialogue for ${dj.name}`}
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                    {dj.bio || dj.description}
                  </p>

                  {/* AI Personality Prompt (voicePrompt) */}
                  {(dj.voicePrompt || dj.personality) && (
                    <div className="p-2.5 rounded-lg bg-background border border-zinc-800 text-[11px] space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent-lime block">
                        AI Personality Prompt (voicePrompt)
                      </span>
                      <p className="text-zinc-400 line-clamp-2 italic">
                        &quot;{dj.voicePrompt || dj.personality}&quot;
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="font-mono text-xs truncate max-w-[160px]">
                    {dj.voiceSampleUrl || dj.voiceSampleFile?.split("/").pop() || "Audio Sample"}
                  </span>
                  <span className="font-semibold text-accent-lime">Fish Audio Cloned</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Side Characters (Pundits, Reporters & Correspondents) */}
      <div className="space-y-4 pt-6 border-t border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-heading">
            Side Characters & Correspondents
          </h2>
          <p className="text-sm text-zinc-400">
            8 specialized pundits and field reporters covering traffic, finance grifts, aura wellness, and municipal tenders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {sideCharacters.map((sc) => {
            const isSpeaking = activeSpeaker === sc.name;
            const hasVoiceId = Boolean(sc.fishAudioVoiceId);
            const scImageUrl = (sc.thumbnailImage || sc.image)
              ? urlForImage(sc.thumbnailImage || sc.image)?.width(200).height(200).url()
              : null;

            return (
              <div
                key={sc.id}
                className={`p-5 rounded-2xl bg-zinc-900/60 border transition-all duration-200 flex flex-col justify-between gap-4 ${
                  isSpeaking
                    ? "border-accent-purple bg-accent-purple/10 shadow-lg shadow-accent-purple/10"
                    : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 shrink-0 flex items-center justify-center">
                        {scImageUrl ? (
                          <Image src={scImageUrl} alt={sc.name} fill className="object-cover" />
                        ) : (
                          <User size={18} className="text-zinc-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-foreground font-heading truncate">
                          {sc.name}
                        </h3>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-purple/20 text-purple-300 border border-accent-purple/30 truncate max-w-full">
                          {sc.role}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => triggerVoiceQuip(sc.id, { type: "commentary" })}
                      disabled={isDucking || isGeneratingVoice}
                      className={`p-2.5 rounded-full transition-all cursor-pointer disabled:opacity-50 shrink-0 ${
                        isSpeaking
                          ? "bg-accent-purple text-foreground animate-pulse"
                          : "bg-zinc-800 text-foreground hover:bg-accent-purple hover:text-foreground"
                      }`}
                      title={`Synthesize live dialogue for ${sc.name}`}
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                    {sc.description}
                  </p>

                  <div className="p-2.5 rounded-lg bg-background border border-zinc-800 text-[11px] space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                      Satirical Archetype
                    </span>
                    <p className="text-zinc-400 line-clamp-2 italic">
                      &quot;{sc.recommendedPreviewText}&quot;
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="font-mono text-xs truncate max-w-[120px]">
                    {sc.voiceSampleFile ? sc.voiceSampleFile.split("/").pop() : "Sample Pending"}
                  </span>
                  <span className={`font-semibold ${hasVoiceId ? "text-accent-lime" : "text-amber-400"}`}>
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
