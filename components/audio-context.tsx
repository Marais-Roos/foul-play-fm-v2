"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { Show, DJ } from "@/lib/types/station";
import { stationBible, getCurrentShow, getDJById, getSideCharacterById } from "@/lib/data/station";
import { JellyfinTrack } from "@/lib/services/jellyfin";
import { HourlyBulletin } from "@/lib/services/bulletin-service";

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
  | 'FINAL_AD'               // 10. Commercial advert (R2)
  | 'POST_AD_SWEEPER'        // 11a. Sweeper after final ad
  | 'SONG_5'                 // 11b. Song 5 (background pre-gen for caller segment)
  | 'CALLER_SWEEP'           // 12. Station sweep before caller segment
  | 'CALLER_SEGMENT';        // 13. Quick caller segment (3 calls, 6-turn conversations)

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

function playAudioOnce(audio: HTMLAudioElement, src: string): Promise<void> {
  return new Promise<void>((resolve) => {
    let finished = false;
    const cleanup = () => {
      if (!finished) {
        finished = true;
        audio.removeEventListener('ended', handleEnd);
        audio.removeEventListener('error', handleError);
        resolve();
      }
    };
    const handleEnd = () => cleanup();
    const handleError = () => cleanup();

    audio.addEventListener('ended', handleEnd, { once: true });
    audio.addEventListener('error', handleError, { once: true });
    audio.src = src;
    audio.play().catch(() => cleanup());
  });
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
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const bulletinAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const voiceGainRef = useRef<GainNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const bulletinGainRef = useRef<GainNode | null>(null);
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

  // Bulletin pre-buffering refs
  const prebufferedBulletinRef = useRef<HourlyBulletin | null>(null);
  const isBulletinPrebufferingRef = useRef<boolean>(false);
  const prebufferBulletinPromiseRef = useRef<Promise<HourlyBulletin | null> | null>(null);
  const prebufferedBulletinHourRef = useRef<number | null>(null);

  const prebufferBulletin = useCallback((targetHour: number, showId?: string) => {
    if (isBulletinPrebufferingRef.current) return;
    if (prebufferedBulletinRef.current && prebufferedBulletinHourRef.current === targetHour) return;

    prebufferedBulletinHourRef.current = targetHour;
    isBulletinPrebufferingRef.current = true;

    const promise = (async () => {
      try {
        const sid = showId || currentShowRef.current.id;
        const res = await fetch(`/api/radio/bulletin?showId=${encodeURIComponent(sid)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.bulletin?.turns) {
            prebufferedBulletinRef.current = data.bulletin as HourlyBulletin;
            return data.bulletin as HourlyBulletin;
          }
        }
      } catch (err) {
        console.warn('Pre-buffering hourly bulletin failed:', err);
      } finally {
        isBulletinPrebufferingRef.current = false;
      }
      return null;
    })();

    prebufferBulletinPromiseRef.current = promise;
  }, []);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    currentShowRef.current = currentShow;
  }, [currentShow]);

  // Helper to fetch random or show-specific asset from Cloudflare R2
  const fetchRandomR2Asset = useCallback(async (
    type: 'random-sweeper' | 'random-ad',
    showId?: string
  ): Promise<{ name: string; url: string } | null> => {
    try {
      const url = showId
        ? `/api/radio/assets?type=${type}&showId=${encodeURIComponent(showId)}`
        : `/api/radio/assets?type=${type}`;
      const res = await fetch(url);
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
    mode: 'intro' | 'reaction' | 'mid-show' | 'caller-block';
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
  const playSongAtCurrentIndex = useCallback(async () => {
    let list = playlistRef.current;
    if ((!list || list.length === 0) && currentShowRef.current) {
      try {
        const params = new URLSearchParams({ showId: currentShowRef.current.id });
        if (currentShowRef.current.jellyfinPlaylistId) {
          params.set('playlistId', currentShowRef.current.jellyfinPlaylistId);
        }
        const res = await fetch(`/api/radio/tracks?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.tracks && data.tracks.length > 0) {
            list = shuffleList<JellyfinTrack>(data.tracks);
            playlistRef.current = list;
            setPlaylist(list);
          }
        }
      } catch (e) {
        console.warn('Fallback playlist fetch error:', e);
      }
    }

    const track = list && list.length > 0 ? list[currentTrackIndexRef.current % list.length] : null;
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
    // If a news bulletin is actively playing, never advance the broadcast clock
    if (isBulletinPlayingRef.current) {
      return;
    }

    const currentStep = clockStepRef.current;
    const currentList = playlistRef.current;
    const show = currentShowRef.current;

    // Handle scheduled live show transition or top of hour bulletin at natural track boundary!
    if (pendingHourlyBulletinRef.current || pendingShowTransitionRef.current) {
      const hasBulletin = pendingHourlyBulletinRef.current;
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

      if (hasBulletin && triggerHourlyBulletinRef.current) {
        await triggerHourlyBulletinRef.current();
        return;
      }

      if (isShowChange) {
        const sweeper = await fetchRandomR2Asset('random-sweeper', show.id);
        if (sweeper && musicAudioRef.current) {
          setCurrentBroadcastItem({
            type: 'sweeper',
            title: 'STATION SWEEPER',
            subtitle: sweeper.name,
          });
          musicAudioRef.current.src = sweeper.url;
          musicAudioRef.current.play().catch(() => advanceBroadcastClock());
          return;
        }
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
        const sweeper = await fetchRandomR2Asset('random-sweeper', show.id);
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
        // Step 10: Final Ad finished -> transition to POST_AD_SWEEPER (Step 11a)
        clockStepRef.current = 'POST_AD_SWEEPER';
        setClockStep('POST_AD_SWEEPER');
        const sweeper = await fetchRandomR2Asset('random-sweeper', show.id);
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

      case 'POST_AD_SWEEPER': {
        // Step 11a: Sweeper finished -> transition to SONG_5 (Step 11b)
        clockStepRef.current = 'SONG_5';
        setClockStep('SONG_5');
        advanceTrackIndex();
        playSongAtCurrentIndex();

        // Background pre-generation: Queue 3-caller phone-in segment (6 turns each)
        triggerPreloadBanter({
          showId: show.id,
          mode: 'caller-block',
        });
        break;
      }

      case 'SONG_5': {
        // Step 11b: SONG_5 finished -> transition to CALLER_SWEEP (Step 12)
        clockStepRef.current = 'CALLER_SWEEP';
        setClockStep('CALLER_SWEEP');
        const sweeper = await fetchRandomR2Asset('random-sweeper', show.id);
        if (sweeper && musicAudioRef.current) {
          setCurrentBroadcastItem({
            type: 'sweeper',
            title: 'CALLER LINE SWEEPER',
            subtitle: sweeper.name,
          });
          musicAudioRef.current.src = sweeper.url;
          musicAudioRef.current.play().catch(() => advanceBroadcastClock());
        } else {
          advanceBroadcastClock();
        }
        break;
      }

      case 'CALLER_SWEEP': {
        // Step 12: Caller line sweep finished -> transition to CALLER_SEGMENT (Step 13)
        clockStepRef.current = 'CALLER_SEGMENT';
        setClockStep('CALLER_SEGMENT');
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
            title: 'LIVE CALLER PHONE-IN',
            subtitle: `${show.title} • 3 On-Air Calls`,
          });
          voiceAudioRef.current.play().catch(() => advanceBroadcastClock());
        } else {
          advanceBroadcastClock();
        }
        break;
      }

      case 'CALLER_SEGMENT': {
        // Step 13: Caller segment finished -> Cycle Complete! Loop back to INITIAL_SWEEPER
        cycleCountRef.current += 1;
        setCycleCount(cycleCountRef.current);
        advanceTrackIndex();

        clockStepRef.current = 'INITIAL_SWEEPER';
        setClockStep('INITIAL_SWEEPER');
        const sweeper = await fetchRandomR2Asset('random-sweeper', show.id);
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
    // If a bulletin is in progress, ignore manual track skipping
    if (isBulletinPlayingRef.current) return;

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
      if (isBulletinPlayingRef.current) return;
      advanceBroadcastClock();
    };
    musicAudio.onerror = () => {
      if (isBulletinPlayingRef.current) return;
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
      if (isBulletinPlayingRef.current) return;
      isVoicePlayingRef.current = false;
      setActiveSpeaker(null);
      setActiveTranscript(null);
      advanceBroadcastClock();
    };
    voiceAudio.onerror = () => {
      if (isBulletinPlayingRef.current) return;
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

    // Ambient Channel (streams news music beds and helicopter SFX)
    const ambientAudio = new Audio();
    ambientAudio.crossOrigin = "anonymous";
    ambientAudio.loop = true;
    ambientAudioRef.current = ambientAudio;

    const ambientSource = ctx.createMediaElementSource(ambientAudio);
    const ambientGain = ctx.createGain();
    ambientGain.gain.setValueAtTime(0, ctx.currentTime);
    ambientSource.connect(ambientGain);
    ambientGain.connect(masterGain);
    ambientGainRef.current = ambientGain;

    // Bulletin Channel (dedicated isolated channel for hourly news bulletins & host reactions)
    const bulletinAudio = new Audio();
    bulletinAudio.crossOrigin = "anonymous";
    bulletinAudioRef.current = bulletinAudio;

    const bulletinSource = ctx.createMediaElementSource(bulletinAudio);
    const bulletinGain = ctx.createGain();
    bulletinGain.gain.setValueAtTime(1.0, ctx.currentTime);
    bulletinSource.connect(bulletinGain);
    bulletinGain.connect(masterGain);
    bulletinGainRef.current = bulletinGain;
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

    // If bulletin is currently in progress, resume bulletin audio and ambient audio
    if (isBulletinPlayingRef.current) {
      if (bulletinAudioRef.current && bulletinAudioRef.current.src && bulletinAudioRef.current.paused) {
        bulletinAudioRef.current.play().catch(() => {});
      }
      if (ambientAudioRef.current && ambientAudioRef.current.src && ambientAudioRef.current.paused) {
        ambientAudioRef.current.play().catch(() => {});
      }
      return;
    }

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
      const sweeper = await fetchRandomR2Asset('random-sweeper', currentShowRef.current.id);
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
    if (ambientAudioRef.current) {
      ambientAudioRef.current.pause();
    }
    if (bulletinAudioRef.current) {
      bulletinAudioRef.current.pause();
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

  // Auto-check live show rollover and top-of-hour bulletin every 5 seconds
  useEffect(() => {
    const checkLiveShow = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const nextHour = (currentHour + 1) % 24;

      // 1. Synthesize bulletin segment earlier:
      // If program is currently running, start synthesizing news, weather, sport & traffic
      // at least two minutes before the top of the hour (:58 or :59)
      if (isPlaying && currentMinute >= 58) {
        if (prebufferedBulletinHourRef.current !== nextHour && !isBulletinPrebufferingRef.current) {
          const upcomingShow = getCurrentShow(new Date(now.getTime() + 2 * 60 * 1000));
          prebufferBulletin(nextHour, upcomingShow.id);
        }
      }

      // 2. Top-of-hour bulletin detection (:00 or :01)
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

    checkLiveShow();
    const interval = setInterval(checkLiveShow, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, prebufferBulletin]);

  const triggerHourlyBulletin = useCallback(async () => {
    if (isBulletinPlayingRef.current) return;
    initAudio();

    setIsBulletinPlaying(true);
    isBulletinPlayingRef.current = true;

    // 1. Duck / pause current music & voice immediately
    if (musicAudioRef.current && isPlaying) {
      musicAudioRef.current.pause();
    }
    if (voiceAudioRef.current && isVoicePlayingRef.current) {
      voiceAudioRef.current.pause();
      isVoicePlayingRef.current = false;
    }

    try {
      let bulletinData: HourlyBulletin | null = prebufferedBulletinRef.current;

      // If pre-buffering is currently in flight, await it
      if (!bulletinData && prebufferBulletinPromiseRef.current) {
        setIsGeneratingVoice(true);
        bulletinData = await Promise.race([
          prebufferBulletinPromiseRef.current,
          new Promise<null>((res) => setTimeout(() => res(null), 10000)),
        ]);
        setIsGeneratingVoice(false);
      }

      // If still not available (e.g. on-demand manual trigger), fetch now
      if (!bulletinData) {
        setIsGeneratingVoice(true);
        const sid = currentShowRef.current.id;
        const res = await fetch(`/api/radio/bulletin?showId=${encodeURIComponent(sid)}`);
        if (!res.ok) throw new Error('Bulletin fetch failed');
        const data = await res.json();
        setIsGeneratingVoice(false);
        if (!data.success || !data.bulletin?.turns) {
          throw new Error('Bulletin returned invalid payload');
        }
        bulletinData = data.bulletin;
      }

      if (!bulletinData?.turns) {
        throw new Error('Bulletin missing turns');
      }

      const { introSweeperUrl, newsBedUrl, helicopterUrl, turns, hostReaction } = bulletinData;

      // 2. Play News Intro Sweeper (from R2) on dedicated bulletin audio channel
      if (introSweeperUrl && bulletinAudioRef.current) {
        const proxyUrl = `/api/radio/asset-stream?url=${encodeURIComponent(introSweeperUrl)}`;
        setCurrentBroadcastItem({
          type: 'sweeper',
          title: 'NEWS & TRAFFIC INTRO',
          subtitle: 'Foul Play FM Bulletin',
        });
        await playAudioOnce(bulletinAudioRef.current, proxyUrl);
      }

      const ctx = audioCtxRef.current;
      const ambientGain = ambientGainRef.current;
      const ambientAudio = ambientAudioRef.current;

      // 3. Start News Bed in background (under Gavin Stone and Gary Miller)
      if (newsBedUrl && ambientAudio && ambientGain && ctx) {
        const proxyBedUrl = `/api/radio/asset-stream?url=${encodeURIComponent(newsBedUrl)}`;
        ambientAudio.src = proxyBedUrl;
        ambientAudio.currentTime = 0;
        ambientAudio.loop = true;
        ambientGain.gain.setValueAtTime(0, ctx.currentTime);
        ambientGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.4);
        ambientAudio.play().catch((e) => console.warn('News bed play error:', e));
      }

      // 4. Sequentially broadcast all 3 anchor turns on dedicated bulletin channel:
      // Turn 1: Gavin Stone (News & Weather - over news bed)
      // Turn 2: Gary Miller (Sport - over news bed)
      // Turn 3: Simon Carter (Chopper 1 Traffic - transitions to helicopter audio!)
      for (const turn of turns) {
        if (!bulletinAudioRef.current) continue;

        const isTrafficTurn = turn.anchorId === 'simon-carter' || turn.segment === 'Traffic Desk';

        // When switching to Simon Carter, transition from News Bed -> Helicopter Sound
        if (isTrafficTurn && helicopterUrl && ambientAudio && ambientGain && ctx) {
          ambientGain.gain.setValueAtTime(ambientGain.gain.value, ctx.currentTime);
          ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
          await new Promise((r) => setTimeout(r, 200));

          const proxyChopperUrl = `/api/radio/asset-stream?url=${encodeURIComponent(helicopterUrl)}`;
          ambientAudio.src = proxyChopperUrl;
          ambientAudio.currentTime = 0;
          ambientAudio.loop = true;
          ambientGain.gain.setValueAtTime(0, ctx.currentTime);
          ambientGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.3);
          ambientAudio.play().catch((e) => console.warn('Chopper play error:', e));
        }

        setActiveSpeaker(turn.anchorName);
        setActiveTranscript(turn.text);
        setCurrentBroadcastItem({
          type: 'banter',
          title: `${turn.anchorName} • ${turn.segment}`,
          subtitle: 'Live Bulletin',
        });

        if (turn.audioBase64) {
          await playAudioOnce(bulletinAudioRef.current, turn.audioBase64);
        } else {
          const readingDelay = Math.min(12000, Math.max(4000, (turn.text.split(' ').length / 2.5) * 1000));
          await new Promise((r) => setTimeout(r, readingDelay));
        }
      }

      // 5. Conclude bulletin turns: Smoothly fade out ambient sound over 1s and pause
      if (ambientAudio && ambientGain && ctx) {
        ambientGain.gain.setValueAtTime(ambientGain.gain.value, ctx.currentTime);
        ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
        setTimeout(() => {
          ambientAudio.pause();
          ambientAudio.currentTime = 0;
        }, 1100);
      }

      setActiveSpeaker(null);
      setActiveTranscript(null);

      // 6. Post-News Host Reaction (no news outro sweep - host reacts immediately):
      // Host sarcastically thanks the crew, mocks Gavin (nerd) or Simon (wannabe pilot), fine with Gary.
      if (hostReaction) {
        setActiveSpeaker(hostReaction.speakerName);
        setActiveTranscript(hostReaction.text);
        setCurrentBroadcastItem({
          type: 'banter',
          title: currentShowRef.current.title,
          subtitle: `${hostReaction.speakerName} • Post-News Reaction`,
        });

        if (hostReaction.audioBase64 && bulletinAudioRef.current) {
          await playAudioOnce(bulletinAudioRef.current, hostReaction.audioBase64);
        } else {
          const readingDelay = Math.min(10000, Math.max(3000, (hostReaction.text.split(' ').length / 2.5) * 1000));
          await new Promise((r) => setTimeout(r, readingDelay));
        }

        setActiveSpeaker(null);
        setActiveTranscript(null);
      }

      // 7. Delete cached bulletin once played (both local ref and server cache)
      prebufferedBulletinRef.current = null;
      prebufferBulletinPromiseRef.current = null;
      prebufferedBulletinHourRef.current = null;
      fetch('/api/radio/bulletin', { method: 'DELETE' }).catch(() => {});

      setIsBulletinPlaying(false);
      isBulletinPlayingRef.current = false;

      // 8. Return to normal programming:
      // Ensure audio event handlers are permanently attached so playback NEVER freezes
      if (musicAudioRef.current) {
        musicAudioRef.current.onended = () => {
          if (isBulletinPlayingRef.current) return;
          advanceBroadcastClock();
        };
        musicAudioRef.current.onerror = () => {
          if (isBulletinPlayingRef.current) return;
          advanceBroadcastClock();
        };
      }
      if (voiceAudioRef.current) {
        voiceAudioRef.current.onended = () => {
          if (isBulletinPlayingRef.current) return;
          isVoicePlayingRef.current = false;
          setActiveSpeaker(null);
          setActiveTranscript(null);
          advanceBroadcastClock();
        };
      }

      if (clockStepRef.current === 'INITIAL_SWEEPER' || pendingShowTransitionRef.current) {
        // Show rollover / new show kickoff: Start at track 0 of the new show's playlist
        pendingShowTransitionRef.current = false;
        currentTrackIndexRef.current = 0;
        setCurrentTrackIndex(0);
        clockStepRef.current = 'SONG_1';
        setClockStep('SONG_1');
        playSongAtCurrentIndex();

        const currentList = playlistRef.current;
        const nextIdx = (currentTrackIndexRef.current + 1) % (currentList.length || 1);
        const nextTrack = currentList[nextIdx];
        triggerPreloadBanter({
          showId: currentShowRef.current.id,
          mode: 'intro',
          isFirstCycle: cycleCountRef.current === 1,
          nextSongName: nextTrack?.title,
          nextArtist: nextTrack?.artist,
        });
      } else {
        // Mid-cycle return: Advance track index so we NEVER replay the song that played before the bulletin
        advanceTrackIndex();

        // Transition to next song step
        const stepMap: Record<ClockStep, ClockStep> = {
          'SONG_1': 'SONG_2',
          'INTRO_BANTER': 'SONG_2',
          'SONG_2': 'SONG_3',
          'COMMERCIAL_BREAK_AD': 'SONG_3',
          'COMMERCIAL_BREAK_SWEEP': 'SONG_3',
          'MID_SHOW_BANTER': 'SONG_3',
          'SONG_3': 'SONG_4',
          'SONG_4': 'SONG_5',
          'SONG_DISCUSSION': 'SONG_5',
          'FINAL_AD': 'SONG_5',
          'POST_AD_SWEEPER': 'SONG_5',
          'SONG_5': 'INITIAL_SWEEPER',
          'CALLER_SWEEP': 'INITIAL_SWEEPER',
          'CALLER_SEGMENT': 'INITIAL_SWEEPER',
          'INITIAL_SWEEPER': 'SONG_1',
        };
        const nextStep = stepMap[clockStepRef.current] || 'SONG_2';
        clockStepRef.current = nextStep;
        setClockStep(nextStep);
        playSongAtCurrentIndex();
      }
    } catch (err) {
      console.error('Hourly bulletin execution error:', err);
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
        ambientAudioRef.current.currentTime = 0;
      }
      if (bulletinAudioRef.current) {
        bulletinAudioRef.current.pause();
        bulletinAudioRef.current.currentTime = 0;
      }
      setIsGeneratingVoice(false);
      setIsBulletinPlaying(false);
      isBulletinPlayingRef.current = false;
      setActiveSpeaker(null);
      setActiveTranscript(null);

      // Restore listeners and advance track on error so station never hangs
      if (musicAudioRef.current) {
        musicAudioRef.current.onended = () => {
          if (isBulletinPlayingRef.current) return;
          advanceBroadcastClock();
        };
        musicAudioRef.current.onerror = () => {
          if (isBulletinPlayingRef.current) return;
          advanceBroadcastClock();
        };
      }
      advanceTrackIndex();
      playSongAtCurrentIndex();
    }
  }, [
    initAudio,
    isPlaying,
    advanceTrackIndex,
    playSongAtCurrentIndex,
    triggerPreloadBanter,
    advanceBroadcastClock,
  ]);

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
