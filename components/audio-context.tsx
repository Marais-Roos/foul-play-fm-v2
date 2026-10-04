"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { Show, DJ } from "@/lib/types/station";
import { stationBible, getCurrentShow, getDJById, getSideCharacterById } from "@/lib/data/station";
import { JellyfinTrack } from "@/lib/services/jellyfin";

export interface VoiceQuipOptions {
  type?: 'quip' | 'traffic' | 'caller' | 'commentary';
  topic?: string;
  customText?: string;
  callerId?: string;
}

export type BroadcastSegmentType = 'song' | 'sweeper' | 'ad' | 'banter';

export interface BroadcastItem {
  type: BroadcastSegmentType;
  title: string;
  subtitle?: string;
}

export type ClockStep =
  | 'INITIAL_SWEEPER'        // 1. Initial station sweeper
  | 'SONG_1'                 // 2. Song 1 (background pre-gen for intro banter teasing song 2)
  | 'INTRO_BANTER'           // 3. Intro banter (Cycle 1: show intro; Cycle 2+: mid-rotation tease)
  | 'SONG_2'                 // 4. Song 2 (background pre-gen for mid-show banter)
  | 'COMMERCIAL_BREAK_AD'    // 5. Commercial break ad (R2)
  | 'COMMERCIAL_BREAK_SWEEP' // 6. Commercial break sweeper (R2)
  | 'MID_SHOW_BANTER'        // 7. Mid-show host banter
  | 'SONG_3'                 // 8a. Song 3
  | 'SONG_4'                 // 8b. Song 4 (background pre-gen for song reaction)
  | 'SONG_DISCUSSION'        // 9. Song discussion / reaction
  | 'FINAL_AD';              // 10. Commercial advert (R2)

interface AudioContextType {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentShow: Show;
  currentDJ: DJ | null;
  currentTrack: JellyfinTrack | null;
  currentBroadcastItem: BroadcastItem | null;
  clockStep: ClockStep;
  cycleCount: number;
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
  updateShowMetadata: (updates: Partial<Show>) => void;
  isBulletinPlaying: boolean;
  triggerHourlyBulletin: () => Promise<void>;
}

const AudioPlayerContext = createContext<AudioContextType | null>(null);

function shuffleList<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

interface PrebufferedVoice {
  audioSrc: string;
  speaker: string;
  text: string;
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [isDucking, setIsDucking] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [activeTranscript, setActiveTranscript] = useState<string | null>(null);
  const [isBulletinPlaying, setIsBulletinPlaying] = useState<boolean>(false);
  const isBulletinPlayingRef = useRef<boolean>(false);

  const [currentShow, setCurrentShow] = useState<Show>(() => getCurrentShow());
  const [playlist, setPlaylist] = useState<JellyfinTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [recentlyPlayed, setRecentlyPlayed] = useState<JellyfinTrack[]>([]);
  const currentTrack = playlist[currentTrackIndex] || null;

  // Load persistent broadcast history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('foulplay_broadcast_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentlyPlayed(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load broadcast history from localStorage:', e);
    }
  }, []);

  // Save persistent broadcast history on update
  useEffect(() => {
    if (recentlyPlayed.length > 0) {
      try {
        localStorage.setItem('foulplay_broadcast_history', JSON.stringify(recentlyPlayed));
      } catch (e) {
        console.warn('Failed to save broadcast history to localStorage:', e);
      }
    }
  }, [recentlyPlayed]);

  // Clock State
  const [clockStep, setClockStep] = useState<ClockStep>('INITIAL_SWEEPER');
  const [cycleCount, setCycleCount] = useState<number>(1);
  const [currentBroadcastItem, setCurrentBroadcastItem] = useState<BroadcastItem | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(1450);
  const totalShowSeconds = 3 * 3600;

  // Web Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const voiceGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const isVoicePlayingRef = useRef<boolean>(false);

  // Synchronized refs for reliable clock scheduling
  const playlistRef = useRef<JellyfinTrack[]>(playlist);
  const currentTrackIndexRef = useRef<number>(0);
  const currentShowRef = useRef<Show>(currentShow);
  const clockStepRef = useRef<ClockStep>('INITIAL_SWEEPER');
  const cycleCountRef = useRef<number>(1);

  // Voice pre-buffering refs
  const prebufferedVoiceRef = useRef<PrebufferedVoice | null>(null);
  const prebufferPromiseRef = useRef<Promise<PrebufferedVoice | null> | null>(null);
  const pendingShowTransitionRef = useRef<boolean>(false);
  const pendingHourlyBulletinRef = useRef<boolean>(false);
  const lastBulletinHourRef = useRef<number>(-1);
  const triggerHourlyBulletinRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    currentShowRef.current = currentShow;
  }, [currentShow]);

  // Helper to fetch random asset from Cloudflare R2
  const fetchRandomR2Asset = useCallback(async (type: 'random-sweeper' | 'random-ad'): Promise<{ name: string; url: string } | null> => {
    try {
      const res = await fetch(`/api/radio/assets?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        if (data.asset?.url) {
          const proxyUrl = `/api/radio/asset-stream?url=${encodeURIComponent(data.asset.url)}`;
          return { name: data.asset.name, url: proxyUrl };
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch ${type}:`, err);
    }
    return null;
  }, []);

  // Helper to trigger background AI voice pre-generation
  const triggerPreloadBanter = useCallback((params: {
    mode: 'intro' | 'reaction' | 'mid-show';
    isFirstCycle?: boolean;
    songName?: string;
    artist?: string;
    nextSongName?: string;
    nextArtist?: string;
    showId: string;
  }) => {
    prebufferedVoiceRef.current = null;
    const promise = (async () => {
      try {
        const res = await fetch('/api/radio/quip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.audioBase64) {
            const item: PrebufferedVoice = {
              audioSrc: data.audioBase64,
              speaker: data.speaker,
              text: data.text,
            };
            prebufferedVoiceRef.current = item;
            return item;
          }
        }
      } catch (e) {
        console.warn('Preload voice banter failed:', e);
      }
      return null;
    })();
    prebufferPromiseRef.current = promise;
  }, []);

  // Helper to record track start in persistent broadcast history
  const recordSongStart = useCallback((track: JellyfinTrack) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const show = currentShowRef.current;
    const stampedTrack: JellyfinTrack = {
      ...track,
      playedAt: timeStr,
      startedAt: now.getTime(),
      showTitle: show?.title,
    };

    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      return [stampedTrack, ...filtered].slice(0, 20);
    });

    return stampedTrack;
  }, []);

  // Helper to advance song index
  const advanceTrackIndex = useCallback(() => {
    const list = playlistRef.current;
    if (!list || list.length === 0) return;
    const currentIdx = currentTrackIndexRef.current;
    const nextIdx = (currentIdx + 1) % list.length;
    currentTrackIndexRef.current = nextIdx;
    setCurrentTrackIndex(nextIdx);
  }, []);

  // Helper to play the song at currentTrackIndex
  const playSongAtCurrentIndex = useCallback(() => {
    const list = playlistRef.current;
    const track = list[currentTrackIndexRef.current];
    if (track && musicAudioRef.current) {
      const stampedTrack = recordSongStart(track);

      setCurrentBroadcastItem({
        type: 'song',
        title: stampedTrack.title,
        subtitle: stampedTrack.artist,
      });
      musicAudioRef.current.src = stampedTrack.streamUrl;
      musicAudioRef.current.play().catch((err: any) => {
        if (err?.name !== 'AbortError') {
          console.warn('Track play error:', err);
        }
      });
    }
  }, [recordSongStart]);

  // Master Broadcast Clock State Machine
  const advanceBroadcastClock = useCallback(async () => {
    const currentStep = clockStepRef.current;
    const currentList = playlistRef.current;
    const show = currentShowRef.current;

    // Handle scheduled live show transition or top of hour bulletin at natural track boundary!
    if (pendingHourlyBulletinRef.current || pendingShowTransitionRef.current) {
      const isShowChange = pendingShowTransitionRef.current;
      pendingHourlyBulletinRef.current = false;
      pendingShowTransitionRef.current = false;

      if (isShowChange) {
        clockStepRef.current = 'INITIAL_SWEEPER';
        setClockStep('INITIAL_SWEEPER');
        cycleCountRef.current = 1;
        setCycleCount(1);
        prebufferedVoiceRef.current = null;
        prebufferPromiseRef.current = null;
        setActiveSpeaker(null);
        setActiveTranscript(null);
      }

      if (triggerHourlyBulletinRef.current) {
        await triggerHourlyBulletinRef.current();
        return;
      }
    }

    switch (currentStep) {
      case 'INITIAL_SWEEPER': {
        // Step 1: Initial Sweeper finished -> transition to SONG_1
        clockStepRef.current = 'SONG_1';
        setClockStep('SONG_1');
        playSongAtCurrentIndex();

        // Background pre-generation: Show intro banter teasing SONG_2
        const nextIdx = (currentTrackIndexRef.current + 1) % currentList.length;
        const nextTrack = currentList[nextIdx];
        triggerPreloadBanter({
          showId: show.id,
          mode: 'intro',
          isFirstCycle: cycleCountRef.current === 1,
          nextSongName: nextTrack?.title,
          nextArtist: nextTrack?.artist,
        });
        break;
      }

      case 'SONG_1': {
        // Step 2: SONG_1 finished -> transition to INTRO_BANTER
        clockStepRef.current = 'INTRO_BANTER';
        setClockStep('INTRO_BANTER');
        if (musicAudioRef.current) musicAudioRef.current.pause();

        // Await pre-buffered voice item
        let voiceItem = prebufferedVoiceRef.current;
        if (!voiceItem && prebufferPromiseRef.current) {
          setIsGeneratingVoice(true);
          voiceItem = await Promise.race([
            prebufferPromiseRef.current,
            new Promise<null>((res) => setTimeout(() => res(null), 5000)),
          ]);
          setIsGeneratingVoice(false);
        }

        if (voiceItem && voiceAudioRef.current) {
          voiceAudioRef.current.src = voiceItem.audioSrc;
          voiceAudioRef.current.currentTime = 0;
          setActiveSpeaker(voiceItem.speaker);
          setActiveTranscript(voiceItem.text);
          isVoicePlayingRef.current = true;
          setCurrentBroadcastItem({
            type: 'banter',
            title: show.title,
            subtitle: voiceItem.speaker,
          });
          voiceAudioRef.current.play().catch(() => advanceBroadcastClock());
        } else {
          // Graceful fallback if synthesis missed
          advanceBroadcastClock();
        }
        break;
      }

      case 'INTRO_BANTER': {
        // Step 3: Intro Banter finished -> transition to SONG_2
        clockStepRef.current = 'SONG_2';
        setClockStep('SONG_2');
        advanceTrackIndex();
        playSongAtCurrentIndex();

        // Background pre-generation: Mid-show banter
        const currentSong = currentList[currentTrackIndexRef.current];
        triggerPreloadBanter({
          showId: show.id,
          mode: 'mid-show',
          songName: currentSong?.title,
          artist: currentSong?.artist,
        });
        break;
      }

      case 'SONG_2': {
        // Step 4: SONG_2 finished -> transition to COMMERCIAL_BREAK_AD
        clockStepRef.current = 'COMMERCIAL_BREAK_AD';
        setClockStep('COMMERCIAL_BREAK_AD');
        const ad = await fetchRandomR2Asset('random-ad');
        if (ad && musicAudioRef.current) {
          setCurrentBroadcastItem({
            type: 'ad',
            title: 'SPONSOR MESSAGE',
            subtitle: ad.name,
          });
          musicAudioRef.current.src = ad.url;
          musicAudioRef.current.play().catch(() => advanceBroadcastClock());
        } else {
          advanceBroadcastClock();
        }
        break;
      }

      case 'COMMERCIAL_BREAK_AD': {
        // Step 5: Commercial Ad finished -> transition to COMMERCIAL_BREAK_SWEEP
        clockStepRef.current = 'COMMERCIAL_BREAK_SWEEP';
        setClockStep('COMMERCIAL_BREAK_SWEEP');
        const sweeper = await fetchRandomR2Asset('random-sweeper');
        if (sweeper && musicAudioRef.current) {
          setCurrentBroadcastItem({
            type: 'sweeper',
            title: 'STATION SWEEPER',
            subtitle: sweeper.name,
          });
          musicAudioRef.current.src = sweeper.url;
          musicAudioRef.current.play().catch(() => advanceBroadcastClock());
        } else {
          advanceBroadcastClock();
        }
        break;
      }

      case 'COMMERCIAL_BREAK_SWEEP': {
        // Step 6: Commercial Sweeper finished -> transition to MID_SHOW_BANTER
        clockStepRef.current = 'MID_SHOW_BANTER';
        setClockStep('MID_SHOW_BANTER');
        if (musicAudioRef.current) musicAudioRef.current.pause();

        let voiceItem = prebufferedVoiceRef.current;
        if (!voiceItem && prebufferPromiseRef.current) {
          setIsGeneratingVoice(true);
          voiceItem = await Promise.race([
            prebufferPromiseRef.current,
            new Promise<null>((res) => setTimeout(() => res(null), 5000)),
          ]);
          setIsGeneratingVoice(false);
        }

        if (voiceItem && voiceAudioRef.current) {
          voiceAudioRef.current.src = voiceItem.audioSrc;
          voiceAudioRef.current.currentTime = 0;
          setActiveSpeaker(voiceItem.speaker);
          setActiveTranscript(voiceItem.text);
          isVoicePlayingRef.current = true;
          setCurrentBroadcastItem({
            type: 'banter',
            title: show.title,
            subtitle: voiceItem.speaker,
          });
          voiceAudioRef.current.play().catch(() => advanceBroadcastClock());
        } else {
          advanceBroadcastClock();
        }
        break;
      }

      case 'MID_SHOW_BANTER': {
        // Step 7: Mid-show banter finished -> transition to SONG_3 (2-song block start)
        clockStepRef.current = 'SONG_3';
        setClockStep('SONG_3');
        advanceTrackIndex();
        playSongAtCurrentIndex();
        break;
      }

      case 'SONG_3': {
        // Step 8a: SONG_3 finished -> transition to SONG_4
        clockStepRef.current = 'SONG_4';
        setClockStep('SONG_4');
        advanceTrackIndex();
        playSongAtCurrentIndex();

        // While SONG_4 plays, trigger background pre-generation for SONG_DISCUSSION reacting to SONG_4
        const song4Track = currentList[currentTrackIndexRef.current];
        triggerPreloadBanter({
          showId: show.id,
          mode: 'reaction',
          songName: song4Track?.title,
          artist: song4Track?.artist,
        });
        break;
      }

      case 'SONG_4': {
        // Step 8b: SONG_4 finished -> transition to SONG_DISCUSSION
        clockStepRef.current = 'SONG_DISCUSSION';
        setClockStep('SONG_DISCUSSION');
        if (musicAudioRef.current) musicAudioRef.current.pause();

        let voiceItem = prebufferedVoiceRef.current;
        if (!voiceItem && prebufferPromiseRef.current) {
          setIsGeneratingVoice(true);
          voiceItem = await Promise.race([
            prebufferPromiseRef.current,
            new Promise<null>((res) => setTimeout(() => res(null), 5000)),
          ]);
          setIsGeneratingVoice(false);
        }

        if (voiceItem && voiceAudioRef.current) {
          voiceAudioRef.current.src = voiceItem.audioSrc;
          voiceAudioRef.current.currentTime = 0;
          setActiveSpeaker(voiceItem.speaker);
          setActiveTranscript(voiceItem.text);
          isVoicePlayingRef.current = true;
          setCurrentBroadcastItem({
            type: 'banter',
            title: show.title,
            subtitle: voiceItem.speaker,
          });
          voiceAudioRef.current.play().catch(() => advanceBroadcastClock());
        } else {
          advanceBroadcastClock();
        }
        break;
      }

      case 'SONG_DISCUSSION': {
        // Step 9: Song discussion finished -> transition to FINAL_AD
        clockStepRef.current = 'FINAL_AD';
        setClockStep('FINAL_AD');
        const ad = await fetchRandomR2Asset('random-ad');
        if (ad && musicAudioRef.current) {
          setCurrentBroadcastItem({
            type: 'ad',
            title: 'SPONSOR MESSAGE',
            subtitle: ad.name,
          });
          musicAudioRef.current.src = ad.url;
          musicAudioRef.current.play().catch(() => advanceBroadcastClock());
        } else {
          advanceBroadcastClock();
        }
        break;
      }

      case 'FINAL_AD': {
        // Step 10: Final Ad finished -> Cycle Complete! Loop back to INITIAL_SWEEPER
        cycleCountRef.current += 1;
        setCycleCount(cycleCountRef.current);
        advanceTrackIndex();

        clockStepRef.current = 'INITIAL_SWEEPER';
        setClockStep('INITIAL_SWEEPER');
        const sweeper = await fetchRandomR2Asset('random-sweeper');
        if (sweeper && musicAudioRef.current) {
          setCurrentBroadcastItem({
            type: 'sweeper',
            title: 'STATION SWEEPER',
            subtitle: sweeper.name,
          });
          musicAudioRef.current.src = sweeper.url;
          musicAudioRef.current.play().catch(() => advanceBroadcastClock());
        } else {
          advanceBroadcastClock();
        }
        break;
      }
    }
  }, [
    advanceTrackIndex,
    playSongAtCurrentIndex,
    fetchRandomR2Asset,
    triggerPreloadBanter,
  ]);

  const skipTrack = useCallback(() => {
    // If voice is currently speaking, stop it cleanly
    if (isVoicePlayingRef.current && voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      isVoicePlayingRef.current = false;
      setActiveSpeaker(null);
      setActiveTranscript(null);
    }
    advanceBroadcastClock();
  }, [advanceBroadcastClock]);

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
            const shuffled = shuffleList<JellyfinTrack>(data.tracks);
            playlistRef.current = shuffled;
            currentTrackIndexRef.current = 0;
            setPlaylist(shuffled);
            setCurrentTrackIndex(0);
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

    // Music Channel (streams songs, ads, and sweepers)
    const musicAudio = new Audio();
    musicAudio.crossOrigin = "anonymous";
    musicAudio.onended = () => {
      advanceBroadcastClock();
    };
    musicAudio.onerror = () => {
      console.warn("Music audio channel error, advancing clock");
      advanceBroadcastClock();
    };
    musicAudioRef.current = musicAudio;

    const musicSource = ctx.createMediaElementSource(musicAudio);
    const musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(1.0, ctx.currentTime);
    musicSource.connect(musicGain);
    musicGain.connect(masterGain);
    musicGainRef.current = musicGain;

    // Voice Channel (streams presenter banter and quips)
    const voiceAudio = new Audio();
    voiceAudio.crossOrigin = "anonymous";
    voiceAudio.onended = () => {
      isVoicePlayingRef.current = false;
      setActiveSpeaker(null);
      setActiveTranscript(null);
      advanceBroadcastClock();
    };
    voiceAudio.onerror = () => {
      console.warn("Voice audio channel error, advancing clock");
      isVoicePlayingRef.current = false;
      setActiveSpeaker(null);
      setActiveTranscript(null);
      advanceBroadcastClock();
    };
    voiceAudioRef.current = voiceAudio;

    const voiceSource = ctx.createMediaElementSource(voiceAudio);
    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(1.0, ctx.currentTime);
    voiceSource.connect(voiceGain);
    voiceGain.connect(masterGain);
    voiceGainRef.current = voiceGain;
  }, [volume, advanceBroadcastClock]);

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

    setIsPlaying(true);

    // If currently paused in the middle of music/ad/sweeper, resume
    if (musicAudioRef.current.src && musicAudioRef.current.paused && !isVoicePlayingRef.current) {
      try {
        await musicAudioRef.current.play();
        return;
      } catch (e) {}
    }

    // If currently paused in the middle of voice banter, resume
    if (voiceAudioRef.current && voiceAudioRef.current.src && voiceAudioRef.current.paused && isVoicePlayingRef.current) {
      try {
        await voiceAudioRef.current.play();
        return;
      } catch (e) {}
    }

    // If starting fresh or at initial sweeper
    if (clockStepRef.current === 'INITIAL_SWEEPER') {
      const sweeper = await fetchRandomR2Asset('random-sweeper');
      if (sweeper && musicAudioRef.current) {
        setCurrentBroadcastItem({
          type: 'sweeper',
          title: 'STATION SWEEPER',
          subtitle: sweeper.name,
        });
        musicAudioRef.current.src = sweeper.url;
        try {
          await musicAudioRef.current.play();
          return;
        } catch (e) {}
      }
    }

    // Otherwise, step clock
    advanceBroadcastClock();
  }, [initAudio, fetchRandomR2Asset, advanceBroadcastClock]);

  const pause = useCallback(() => {
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
    }
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
    }
    setIsPlaying(false);
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

  // On-demand Voice Quip (manual trigger ducking over current audio)
  const triggerVoiceQuip = useCallback(async (
    characterId?: string,
    options?: VoiceQuipOptions
  ) => {
    initAudio();
    if (!audioCtxRef.current || !voiceAudioRef.current || !musicGainRef.current) return;

    if (isVoicePlayingRef.current) {
      console.log("A presenter is currently speaking on air. Ignoring overlapping trigger.");
      return;
    }

    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }

    setIsGeneratingVoice(true);

    try {
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
          songName: currentTrack?.title,
          artist: currentTrack?.artist,
          currentTrackTitle: currentTrack ? `${currentTrack.title} by ${currentTrack.artist}` : undefined,
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

      // Fallback
      if (!audioSrc) {
        const targetId = characterId || currentShow.hostIds[0];
        const dj = targetId ? getDJById(targetId) : undefined;
        const sc = targetId ? getSideCharacterById(targetId) : undefined;
        let targetFile = dj?.voiceSampleFile || sc?.voiceSampleFile || "data/voices/main_presenters/chip_walton_sample.mp3";
        speakerName = dj?.name || sc?.name || currentShow.hostNames.split("&")[0].trim() || "Foul Play FM Host";
        audioSrc = `/api/audio/voice?file=${encodeURIComponent(targetFile)}`;
        transcriptText = "Broadcasting live on Foul Play FM!";
      }

      setIsGeneratingVoice(false);
      setActiveSpeaker(speakerName);
      setActiveTranscript(transcriptText);
      setIsDucking(true);
      isVoicePlayingRef.current = true;

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
        isVoicePlayingRef.current = false;
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
      isVoicePlayingRef.current = false;
      setIsGeneratingVoice(false);
      setIsDucking(false);
      setActiveSpeaker(null);
      setActiveTranscript(null);
    }
  }, [currentShow, currentTrack, initAudio, isPlaying]);

  const updateShowMetadata = useCallback((updates: Partial<Show>) => {
    setCurrentShow((prev) => {
      const updated = { ...prev, ...updates };
      currentShowRef.current = updated;
      return updated;
    });
  }, []);

  // Auto-check live show rollover and top-of-hour bulletin every 15 seconds
  useEffect(() => {
    const checkLiveShow = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Top-of-hour bulletin detection (:00 or :01)
      if (currentMinute <= 1 && lastBulletinHourRef.current !== currentHour) {
        lastBulletinHourRef.current = currentHour;
        pendingHourlyBulletinRef.current = true;
      }

      const live = getCurrentShow();
      setCurrentShow((prev) => {
        if (prev.id !== live.id) {
          currentShowRef.current = live;
          // Mark transition pending so next track boundary kicks off the new show
          pendingShowTransitionRef.current = true;
          // If paused, immediately reset clock state to Cycle 1 / Initial Sweeper
          if (!isPlaying) {
            clockStepRef.current = 'INITIAL_SWEEPER';
            setClockStep('INITIAL_SWEEPER');
            cycleCountRef.current = 1;
            setCycleCount(1);
            prebufferedVoiceRef.current = null;
            prebufferPromiseRef.current = null;
            setActiveSpeaker(null);
            setActiveTranscript(null);
          }
          return live;
        }
        return prev;
      });
    };

    const interval = setInterval(checkLiveShow, 15000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const triggerHourlyBulletin = useCallback(async () => {
    if (isBulletinPlayingRef.current) return;
    initAudio();

    setIsBulletinPlaying(true);
    isBulletinPlayingRef.current = true;
    setIsGeneratingVoice(true);

    try {
      const res = await fetch('/api/radio/bulletin');
      if (!res.ok) throw new Error('Bulletin fetch failed');
      const data = await res.json();
      setIsGeneratingVoice(false);

      if (!data.success || !data.bulletin?.turns) {
        throw new Error('Bulletin returned invalid payload');
      }

      const { introSweeperUrl, turns } = data.bulletin;

      // 1. Duck / pause current music
      if (musicAudioRef.current && isPlaying) {
        musicAudioRef.current.pause();
      }

      // 2. Play News Intro Sweeper (from R2) if present
      if (introSweeperUrl && musicAudioRef.current) {
        const proxyUrl = `/api/radio/asset-stream?url=${encodeURIComponent(introSweeperUrl)}`;
        setCurrentBroadcastItem({
          type: 'sweeper',
          title: 'NEWS & TRAFFIC INTRO',
          subtitle: 'Foul Play FM Bulletin',
        });
        await new Promise<void>((resolve) => {
          if (!musicAudioRef.current) return resolve();
          musicAudioRef.current.src = proxyUrl;
          musicAudioRef.current.onended = () => resolve();
          musicAudioRef.current.play().catch(() => resolve());
        });
      }

      // 3. Sequentially broadcast all 3 anchor turns:
      // Turn 1: Gavin Stone (News & Weather)
      // Turn 2: Gary Miller (Sport)
      // Turn 3: Simon Carter (Traffic Desk)
      for (const turn of turns) {
        if (!voiceAudioRef.current) continue;

        setActiveSpeaker(turn.anchorName);
        setActiveTranscript(turn.text);
        setCurrentBroadcastItem({
          type: 'banter',
          title: `${turn.anchorName} • ${turn.segment}`,
          subtitle: 'Live Bulletin',
        });
        isVoicePlayingRef.current = true;

        if (turn.audioBase64) {
          await new Promise<void>((resolve) => {
            if (!voiceAudioRef.current) return resolve();
            voiceAudioRef.current.src = turn.audioBase64;
            voiceAudioRef.current.currentTime = 0;
            voiceAudioRef.current.onended = () => resolve();
            voiceAudioRef.current.play().catch(() => resolve());
          });
        } else {
          const readingDelay = Math.min(12000, Math.max(4000, (turn.text.split(' ').length / 2.5) * 1000));
          await new Promise((r) => setTimeout(r, readingDelay));
        }
      }

      // 4. Conclude bulletin and resume show music
      setActiveSpeaker(null);
      setActiveTranscript(null);
      isVoicePlayingRef.current = false;
      setIsBulletinPlaying(false);
      isBulletinPlayingRef.current = false;

      if (musicAudioRef.current) {
        if (clockStepRef.current === 'INITIAL_SWEEPER') {
          const sweeper = await fetchRandomR2Asset('random-sweeper');
          if (sweeper && musicAudioRef.current) {
            setCurrentBroadcastItem({
              type: 'sweeper',
              title: 'STATION SWEEPER',
              subtitle: `${currentShowRef.current.title} • Foul Play FM`,
            });
            musicAudioRef.current.src = sweeper.url;
            musicAudioRef.current.play().catch(() => advanceBroadcastClock());
          } else {
            advanceBroadcastClock();
          }
        } else {
          playSongAtCurrentIndex();
        }
      }
    } catch (err) {
      console.error('Hourly bulletin execution error:', err);
      setIsGeneratingVoice(false);
      setIsBulletinPlaying(false);
      isBulletinPlayingRef.current = false;
      setActiveSpeaker(null);
      setActiveTranscript(null);
      if (musicAudioRef.current && isPlaying) {
        musicAudioRef.current.play().catch(() => {});
      }
    }
  }, [initAudio, isPlaying, playSongAtCurrentIndex, fetchRandomR2Asset, advanceBroadcastClock]);

  useEffect(() => {
    triggerHourlyBulletinRef.current = triggerHourlyBulletin;
  }, [triggerHourlyBulletin]);

  const selectShow = useCallback((show: Show) => {
    setCurrentShow(show);
    currentShowRef.current = show;
    pendingShowTransitionRef.current = false;
    // Reset clock state on show switch
    clockStepRef.current = 'INITIAL_SWEEPER';
    setClockStep('INITIAL_SWEEPER');
    cycleCountRef.current = 1;
    setCycleCount(1);
    prebufferedVoiceRef.current = null;
    prebufferPromiseRef.current = null;
    setActiveSpeaker(null);
    setActiveTranscript(null);
  }, []);

  const currentDJ = (currentShow.hostIds && currentShow.hostIds[0] ? getDJById(currentShow.hostIds[0]) : null) || null;

  return (
    <AudioPlayerContext.Provider
      value={{
        isPlaying,
        isMuted,
        volume,
        currentShow,
        currentDJ,
        currentTrack,
        currentBroadcastItem,
        clockStep,
        cycleCount,
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
        updateShowMetadata,
        isBulletinPlaying,
        triggerHourlyBulletin,
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
