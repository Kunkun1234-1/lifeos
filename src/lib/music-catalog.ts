export type MusicTrackKind = "builtin" | "uploaded";

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  src: string;
  kind: MusicTrackKind;
};

/** Procedural calm pads shipped under public/music (original, free to use). */
export const BUILTIN_MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "builtin-piano-morning",
    title: "晨光钢琴",
    artist: "Life Game",
    src: "/music/piano-morning.mp3",
    kind: "builtin",
  },
  {
    id: "builtin-piano-focus",
    title: "专注柔光",
    artist: "Life Game",
    src: "/music/piano-focus.mp3",
    kind: "builtin",
  },
  {
    id: "builtin-piano-dusk",
    title: "暮色练习曲",
    artist: "Life Game",
    src: "/music/piano-dusk.mp3",
    kind: "builtin",
  },
];
