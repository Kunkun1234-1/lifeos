"use client";

import { create } from "zustand";
import { BUILTIN_MUSIC_TRACKS, type MusicTrack } from "@/lib/music-catalog";

const STORAGE_KEY = "life-game-music-v1";

type PersistedMusic = {
  uploaded: MusicTrack[];
  currentId: string | null;
  volume: number;
};

type MusicPlayerState = {
  tracks: MusicTrack[];
  currentId: string | null;
  playing: boolean;
  volume: number;
  /** 0..1 playback progress */
  progress: number;
  duration: number;
  panelOpen: boolean;
  hydrated: boolean;
  /** Bumped to force audio element to seek to 0 on current track. */
  restartNonce: number;
  hydrate: () => void;
  setPlaying: (playing: boolean) => void;
  play: (id?: string) => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seekRatio: (ratio: number) => void;
  setProgress: (progress: number, duration: number) => void;
  setVolume: (volume: number) => void;
  setPanelOpen: (open: boolean) => void;
  addUploaded: (track: Omit<MusicTrack, "kind" | "id"> & { id?: string }) => void;
  removeUploaded: (id: string) => void;
};

function loadPersisted(): PersistedMusic {
  if (typeof window === "undefined") {
    return { uploaded: [], currentId: BUILTIN_MUSIC_TRACKS[0]?.id ?? null, volume: 0.45 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        uploaded: [],
        currentId: BUILTIN_MUSIC_TRACKS[0]?.id ?? null,
        volume: 0.45,
      };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedMusic>;
    const uploaded = Array.isArray(parsed.uploaded)
      ? parsed.uploaded.filter(
          (t): t is MusicTrack =>
            !!t &&
            typeof t.id === "string" &&
            typeof t.src === "string" &&
            typeof t.title === "string",
        )
      : [];
    return {
      uploaded,
      currentId:
        typeof parsed.currentId === "string"
          ? parsed.currentId
          : (BUILTIN_MUSIC_TRACKS[0]?.id ?? null),
      volume:
        typeof parsed.volume === "number"
          ? Math.min(1, Math.max(0, parsed.volume))
          : 0.45,
    };
  } catch {
    return {
      uploaded: [],
      currentId: BUILTIN_MUSIC_TRACKS[0]?.id ?? null,
      volume: 0.45,
    };
  }
}

function persist(state: Pick<MusicPlayerState, "tracks" | "currentId" | "volume">) {
  if (typeof window === "undefined") return;
  const uploaded = state.tracks.filter((t) => t.kind === "uploaded");
  const payload: PersistedMusic = {
    uploaded,
    currentId: state.currentId,
    volume: state.volume,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

function mergeTracks(uploaded: MusicTrack[]): MusicTrack[] {
  const cleaned = uploaded.map((t) => ({ ...t, kind: "uploaded" as const }));
  return [...BUILTIN_MUSIC_TRACKS, ...cleaned];
}

function indexOfCurrent(tracks: MusicTrack[], currentId: string | null) {
  if (!currentId) return 0;
  const idx = tracks.findIndex((t) => t.id === currentId);
  return idx >= 0 ? idx : 0;
}

export const useMusicPlayerStore = create<MusicPlayerState>((set, get) => ({
  tracks: [...BUILTIN_MUSIC_TRACKS],
  currentId: BUILTIN_MUSIC_TRACKS[0]?.id ?? null,
  playing: false,
  volume: 0.45,
  progress: 0,
  duration: 0,
  panelOpen: false,
  hydrated: false,
  restartNonce: 0,

  hydrate: () => {
    if (get().hydrated) return;
    const saved = loadPersisted();
    const tracks = mergeTracks(saved.uploaded);
    const currentId =
      tracks.some((t) => t.id === saved.currentId)
        ? saved.currentId
        : (tracks[0]?.id ?? null);
    set({
      tracks,
      currentId,
      volume: saved.volume,
      hydrated: true,
    });
  },

  setPlaying: (playing) => set({ playing }),

  play: (id) => {
    const { tracks, currentId } = get();
    const nextId = id ?? currentId ?? tracks[0]?.id ?? null;
    if (!nextId) return;
    set({ currentId: nextId, playing: true, progress: id && id !== currentId ? 0 : get().progress });
    persist({ ...get(), currentId: nextId });
  },

  pause: () => set({ playing: false }),

  toggle: () => {
    const { playing, play, pause } = get();
    if (playing) pause();
    else play();
  },

  next: () => {
    const { tracks, currentId, play } = get();
    if (tracks.length === 0) return;
    const idx = indexOfCurrent(tracks, currentId);
    const next = tracks[(idx + 1) % tracks.length];
    play(next.id);
  },

  prev: () => {
    const { tracks, currentId, play, progress } = get();
    if (tracks.length === 0) return;
    if (progress > 3) {
      set((s) => ({
        progress: 0,
        playing: true,
        restartNonce: s.restartNonce + 1,
      }));
      return;
    }
    const idx = indexOfCurrent(tracks, currentId);
    const prevTrack = tracks[(idx - 1 + tracks.length) % tracks.length];
    play(prevTrack.id);
  },

  seekRatio: (ratio) => {
    const clamped = Math.min(1, Math.max(0, ratio));
    const { duration } = get();
    set({ progress: clamped * duration });
  },

  setProgress: (progress, duration) => set({ progress, duration }),

  setVolume: (volume) => {
    const next = Math.min(1, Math.max(0, volume));
    set({ volume: next });
    persist(get());
  },

  setPanelOpen: (open) => set({ panelOpen: open }),

  addUploaded: (track) => {
    const id =
      track.id ??
      `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const nextTrack: MusicTrack = {
      id,
      title: track.title,
      artist: track.artist || "我的上传",
      src: track.src,
      kind: "uploaded",
    };
    set((s) => {
      const tracks = [...s.tracks.filter((t) => t.id !== id), nextTrack];
      // keep builtins first
      const builtins = tracks.filter((t) => t.kind === "builtin");
      const uploaded = tracks.filter((t) => t.kind === "uploaded");
      return {
        tracks: [...builtins, ...uploaded],
        currentId: id,
        playing: true,
        progress: 0,
      };
    });
    persist(get());
  },

  removeUploaded: (id) => {
    set((s) => {
      const tracks = s.tracks.filter((t) => !(t.kind === "uploaded" && t.id === id));
      const currentId =
        s.currentId === id ? (tracks[0]?.id ?? null) : s.currentId;
      return {
        tracks,
        currentId,
        playing: s.currentId === id ? false : s.playing,
        progress: s.currentId === id ? 0 : s.progress,
      };
    });
    persist(get());
  },
}));

export function selectCurrentTrack(state: MusicPlayerState): MusicTrack | null {
  return state.tracks.find((t) => t.id === state.currentId) ?? state.tracks[0] ?? null;
}
