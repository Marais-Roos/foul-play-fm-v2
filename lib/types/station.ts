export interface WeatherRegion {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface TrafficCorridor {
  id: string;
  name: string;
  points: string[];
}

export interface StationMetadata {
  name: string;
  frequency: string;
  tagline: string;
  location: string;
  weatherRegions: WeatherRegion[];
  trafficCorridors: TrafficCorridor[];
}

export interface TimeSlot {
  start: string;       // e.g. "06:00"
  end: string;         // e.g. "09:00"
  startHour: number;   // 6
  endHour: number;     // 9
}

export interface Show {
  id: string;
  title: string;
  timeSlot: TimeSlot;
  hostIds: string[];
  hostNames: string;
  topics: string[];
  musicGenres: string[];
  vibe: string;
  shortDescription: string;
  detailedDescription: string;
  description?: string;
  jellyfinPlaylistId?: string;
  coverImage?: any;
  thumbnailWithOverlay?: any;
  imageWithOverlay?: any;
  thumbnailWithoutOverlay?: any;
  imageWithoutOverlay?: any;
  studioImage?: any;
  imageUrl?: string;
  sideCharacters?: SideCharacter[];
  callers?: CallerPersona[];
  allowedCallerTags?: string[];
}

export interface DJ {
  id: string;
  name: string;
  parodyOf: string;
  description: string;
  personality: string;
  voiceSampleFile: string;
  fishAudioVoiceId: string | null;
  voicePrompt?: string;
  bio?: string;
  image?: any;
  thumbnailImage?: any;
  backdropImage?: any;
  voiceSampleUrl?: string;
}

export interface SideCharacter {
  id: string;
  name: string;
  parodyOf: string;
  role: string;
  description: string;
  aiPersonalityPrompt: string;
  voiceDesignPrompt: string;
  recommendedPreviewText: string;
  voiceSampleFile: string;
  fishAudioVoiceId: string | null;
  image?: any;
  thumbnailImage?: any;
  backdropImage?: any;
  voiceSampleUrl?: string;
}

export interface CallerPersona {
  voiceTag: string;
  id: string;
  archetype: string;
  targetOfSatire: string;
  aiContextStrategy: string;
  description: string;
  voiceDesignPrompt: string;
  recommendedPreviewText: string;
  fishAudioVoiceId: string | null;
  voicePrompt?: string;
  gender?: 'male' | 'female' | 'neutral' | string;
  names?: string[];
}

export interface StationBible {
  station: StationMetadata;
  shows: Show[];
  djs: DJ[];
  sideCharacters: SideCharacter[];
  callers: CallerPersona[];
}

// Playout and Cue Sheet Types
export type CueItemType = 
  | 'music'
  | 'talk'
  | 'sweeper'
  | 'commercial'
  | 'station_id'
  | 'news'
  | 'weather'
  | 'traffic'
  | 'caller_callin';

export interface CueItem {
  id: string;
  type: CueItemType;
  title: string;
  artistOrHost?: string;
  durationSeconds: number;
  offsetSeconds: number;      // Seconds from start of the hour (0 to 3599)
  audioUrl: string;           // Jellyfin stream URL or Cloudflare R2 public URL
  duckMusic?: boolean;        // If true, dips music channel gain to 20%
  usePhoneFilter?: boolean;   // If true, applies bandpass telephone EQ
  transcript?: string;        // Text of generated dialogue / lyrics / description
  artworkUrl?: string;        // Album or character avatar URL
  metadata?: Record<string, unknown>;
}

export interface HourlyCueSheet {
  id: string;                 // e.g. "2026-10-03T14:00:00Z"
  date: string;               // "2026-10-03"
  hour: number;               // 14
  showId: string;
  showTitle: string;
  hostNames: string;
  items: CueItem[];
  totalDurationSeconds: number;
  generatedAt: string;
}

export interface PlayerState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;             // 0.0 to 1.0
  currentShow: Show | null;
  currentCueItem: CueItem | null;
  playbackPosition: number;   // In seconds within the current track/cue
  liveSyncOffset: number;     // Milliseconds deviation from true station clock
  bufferedAheadSeconds: number;
}
