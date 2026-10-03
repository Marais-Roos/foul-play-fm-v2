"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { Show, DJ } from "@/lib/types/station";
import { stationBible, getCurrentShow } from "@/lib/data/station";
import { JellyfinTrack, FALLBACK_TRACKS } from "@/lib/services/jellyfin";

export interface VoiceQuipOptions {
  type?: 'quip' | 'traffic' | 'caller' | 'commentary';
  topic?: string;
  customText?: string;
  callerId?: string;
}

interface AudioContextType {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentShow: Show;
  currentDJ: DJ | null;
  currentTrack: JellyfinTrack | null;
  playlist: JellyfinTrack[];
  recentlyPlayed: JellyfinTrack[];
  activeSpeaker: string | null;
  activeTranscript: string | null;
  isGeneratingVoice: boolean;
  isDucking: boolean;
  elapsedSeconds: number;
  totalShowSeconds: number;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  skipTrack: () => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  triggerVoiceQuip: (characterId?: string, options?: VoiceQuipOptions) => Promise<void>;
  selectShow: (show: Show) => void;
}

const AudioPlayerContext = createContext<AudioContextType | null>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [isDucking, setIsDucking] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [activeTranscript, setActiveTranscript] = useState<string | null>(null);
  
  const [currentShow, setCurrentShow] = useState<Show>(() => getCurrentShow());
  const [playlist, setPlaylist] = useState<JellyfinTrack[]>(FALLBACK_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [recentlyPlayed, setRecentlyPlayed] = useState<JellyfinTrack[]>([]);
  const currentTrack = playlist[currentTrackIndex] || null;

  const [elapsedSeconds, setElapsedSeconds] = useState(1450); // e.g. 24 mins in
  const totalShowSeconds = 3 * 3600; // 3 hours

  // Web Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const voiceGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  // Advance to next track in playlist (or loop)
  const advanceTrack = useCallback(() => {
    setPlaylist((currentPlaylist) => {
      if (currentPlaylist.length === 0) return currentPlaylist;

      setCurrentTrackIndex((prevIdx) => {
        const current = currentPlaylist[prevIdx];
        if (current) {
          setRecentlyPlayed((prevRec) => {
            const filtered = prevRec.filter((t) => t.id !== current.id);
            return [current, ...filtered].slice(0, 8);
          });
        }

        const nextIdx = (prevIdx + 1) % currentPlaylist.length;
        const nextTrackItem = currentPlaylist[nextIdx];
        if (musicAudioRef.current && nextTrackItem) {
          musicAudioRef.current.src = nextTrackItem.streamUrl;
          musicAudioRef.current.play().catch(console.warn);
        }
        return nextIdx;
      });

      return currentPlaylist;
    });
  }, []);

  const skipTrack = useCallback(() => {
    advanceTrack();
  }, [advanceTrack]);

  // Fetch show playlist from Jellyfin API whenever current show changes
  useEffect(() => {
    let isCancelled = false;
    async function loadTracks() {
      try {
        const params = new URLSearchParams({ showId: currentShow.id });
        if (currentShow.jellyfinPlaylistId) {
          params.set('playlistId', currentShow.jellyfinPlaylistId);
        }

        const res = await fetch(`/api/radio/tracks?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.tracks && data.tracks.length > 0) {
            setPlaylist(data.tracks);
            setCurrentTrackIndex(0);
            if (musicAudioRef.current && musicAudioRef.current.src !== data.tracks[0].streamUrl) {
              const wasPlaying = !musicAudioRef.current.paused;
              musicAudioRef.current.src = data.tracks[0].streamUrl;
              if (wasPlaying) {
                musicAudioRef.current.play().catch(() => {});
              }
            }
          }
        }
      } catch (err) {
        console.warn('Could not load Jellyfin tracks for show:', err);
      }
    }
    loadTracks();
    return () => {
      isCancelled = true;
    };
  }, [currentShow.id, currentShow.jellyfinPlaylistId]);

  // Initialize Web Audio graph
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, ctx.currentTime);
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    // Music Channel (streams Jellyfin audio with auto-advance)
    const musicAudio = new Audio();
    musicAudio.crossOrigin = "anonymous";
    const initialTrack = playlist[currentTrackIndex] || FALLBACK_TRACKS[0];
    musicAudio.src = initialTrack.streamUrl;
    musicAudio.onended = () => {
      advanceTrack();
    };
    musicAudioRef.current = musicAudio;

    const musicSource = ctx.createMediaElementSource(musicAudio);
    const musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(1.0, ctx.currentTime);
    musicSource.connect(musicGain);
    musicGain.connect(masterGain);
    musicGainRef.current = musicGain;

    // Voice Channel
    const voiceAudio = new Audio();
    voiceAudio.crossOrigin = "anonymous";
    voiceAudioRef.current = voiceAudio;

    const voiceSource = ctx.createMediaElementSource(voiceAudio);
    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(1.0, ctx.currentTime);
    voiceSource.connect(voiceGain);
    voiceGain.connect(masterGain);
    voiceGainRef.current = voiceGain;
  }, [volume, playlist, currentTrackIndex, advanceTrack]);

  // Tick the show clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => (prev >= totalShowSeconds ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [totalShowSeconds]);

  const play = useCallback(async () => {
    initAudio();
    if (!audioCtxRef.current || !musicAudioRef.current) return;

    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }

    try {
      if (!musicAudioRef.current.src && playlist.length > 0) {
        musicAudioRef.current.src = playlist[currentTrackIndex].streamUrl;
      }
      await musicAudioRef.current.play();
      setIsPlaying(true);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.warn("Autoplay blocked or stream error:", e);
      }
    }
  }, [initAudio, playlist, currentTrackIndex]);

  const pause = useCallback(() => {
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
    }
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
    }
    setIsPlaying(false);
    setIsDucking(false);
    setActiveSpeaker(null);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const setVolume = useCallback((val: number) => {
    setVolumeState(val);
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(val, audioCtxRef.current.currentTime);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      if (masterGainRef.current && audioCtxRef.current) {
        masterGainRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
      }
    } else {
      setIsMuted(true);
      if (masterGainRef.current && audioCtxRef.current) {
        masterGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
      }
    }
  }, [isMuted, volume]);

  // Dynamic Audio Ducking Engine with Gemini + Fish Audio S2.1 Pro
  const triggerVoiceQuip = useCallback(async (
    characterId?: string,
    options?: VoiceQuipOptions
  ) => {
    initAudio();
    if (!audioCtxRef.current || !voiceAudioRef.current || !musicGainRef.current) return;

    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }

    setIsGeneratingVoice(true);

    try {
      // 1. Fetch dynamic AI satire from /api/radio/quip
      const res = await fetch("/api/radio/quip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          showId: currentShow.id,
          type: options?.type || "quip",
          topic: options?.topic,
          customText: options?.customText,
          callerId: options?.callerId,
        }),
      });

      let audioSrc = "";
      let speakerName = "";
      let transcriptText = "";

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.audioBase64) {
          audioSrc = data.audioBase64;
          speakerName = data.speaker;
          transcriptText = data.text;
        }
      }

      // Fallback to static sample if synthesis was unavailable
      if (!audioSrc) {
        let targetFile = "data/voices/main_presenters/tony_tatum_sample.mp3";
        speakerName = "Tony \"The Titan\" Tatum";
        if (characterId) {
          const dj = stationBible.djs.find((d) => d.id === characterId);
          const sc = stationBible.sideCharacters.find((s) => s.id === characterId);
          if (dj?.voiceSampleFile) {
            targetFile = dj.voiceSampleFile;
            speakerName = dj.name;
          } else if (sc?.voiceSampleFile) {
            targetFile = sc.voiceSampleFile;
            speakerName = sc.name;
          }
        }
        audioSrc = `/api/audio/voice?file=${encodeURIComponent(targetFile)}`;
        transcriptText = "Broadcasting live on Foul Play FM!";
      }

      setIsGeneratingVoice(false);
      setActiveSpeaker(speakerName);
      setActiveTranscript(transcriptText);
      setIsDucking(true);

      const ctx = audioCtxRef.current;
      const musicGain = musicGainRef.current;
      const voiceAudio = voiceAudioRef.current;

      // Smoothly duck music volume to 20% over 250ms
      const now = ctx.currentTime;
      musicGain.gain.setValueAtTime(musicGain.gain.value, now);
      musicGain.gain.linearRampToValueAtTime(0.20, now + 0.25);

      voiceAudio.src = audioSrc;
      voiceAudio.currentTime = 0;

      voiceAudio.onended = () => {
        // Smoothly restore music volume over 400ms
        const endNow = ctx.currentTime;
        musicGain.gain.setValueAtTime(musicGain.gain.value, endNow);
        musicGain.gain.linearRampToValueAtTime(1.0, endNow + 0.4);
        setIsDucking(false);
        setActiveSpeaker(null);
        setActiveTranscript(null);
      };

      await voiceAudio.play();
      if (!isPlaying && musicAudioRef.current) {
        await musicAudioRef.current.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.error("Error playing voice quip:", e);
      setIsGeneratingVoice(false);
      setIsDucking(false);
      setActiveSpeaker(null);
      setActiveTranscript(null);
    }
  }, [currentShow, initAudio, isPlaying]);

  const selectShow = useCallback((show: Show) => {
    setCurrentShow(show);
  }, []);

  const currentDJ = stationBible.djs.find((d) => currentShow.hostIds.includes(d.id)) || null;

  return (
    <AudioPlayerContext.Provider
      value={{
        isPlaying,
        isMuted,
        volume,
        currentShow,
        currentDJ,
        currentTrack,
        playlist,
        recentlyPlayed,
        activeSpeaker,
        activeTranscript,
        isGeneratingVoice,
        isDucking,
        elapsedSeconds,
        totalShowSeconds,
        play,
        pause,
        togglePlay,
        skipTrack,
        setVolume,
        toggleMute,
        triggerVoiceQuip,
        selectShow,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return ctx;
}
