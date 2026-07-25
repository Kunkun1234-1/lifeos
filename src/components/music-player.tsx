"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import {
  ListMusic,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Trash2,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { api } from "@/lib/fetcher";
import {
  selectCurrentTrack,
  useMusicPlayerStore,
} from "@/stores/music-player";
import styles from "./music-player.module.css";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MusicPlayer() {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const seekFromUser = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const hydrate = useMusicPlayerStore((s) => s.hydrate);
  const tracks = useMusicPlayerStore((s) => s.tracks);
  const playing = useMusicPlayerStore((s) => s.playing);
  const volume = useMusicPlayerStore((s) => s.volume);
  const progress = useMusicPlayerStore((s) => s.progress);
  const duration = useMusicPlayerStore((s) => s.duration);
  const panelOpen = useMusicPlayerStore((s) => s.panelOpen);
  const hydrated = useMusicPlayerStore((s) => s.hydrated);
  const restartNonce = useMusicPlayerStore((s) => s.restartNonce);
  const current = useMusicPlayerStore(selectCurrentTrack);

  const play = useMusicPlayerStore((s) => s.play);
  const pause = useMusicPlayerStore((s) => s.pause);
  const toggle = useMusicPlayerStore((s) => s.toggle);
  const next = useMusicPlayerStore((s) => s.next);
  const prev = useMusicPlayerStore((s) => s.prev);
  const setVolume = useMusicPlayerStore((s) => s.setVolume);
  const setProgress = useMusicPlayerStore((s) => s.setProgress);
  const setPanelOpen = useMusicPlayerStore((s) => s.setPanelOpen);
  const setPlaying = useMusicPlayerStore((s) => s.setPlaying);
  const addUploaded = useMusicPlayerStore((s) => s.addUploaded);
  const removeUploaded = useMusicPlayerStore((s) => s.removeUploaded);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Pause global music on gacha page (has its own BGM).
  useEffect(() => {
    if (pathname.startsWith("/gacha")) {
      pause();
      const audio = audioRef.current;
      if (audio) audio.pause();
    }
  }, [pathname, pause]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hydrated) return;
    audio.volume = volume;
  }, [volume, hydrated]);

  useEffect(() => {
    if (!restartNonce) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => setPlaying(false));
  }, [restartNonce, setPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hydrated || !current) return;
    const nextSrc = current.src;
    const abs = new URL(nextSrc, window.location.origin).href;
    if (audio.src !== abs) {
      audio.src = nextSrc;
      audio.load();
    }
    if (playing && !pathname.startsWith("/gacha")) {
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [current?.src, current?.id, playing, hydrated, pathname, setPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      if (seekFromUser.current) return;
      setProgress(audio.currentTime, audio.duration || 0);
    };
    const onMeta = () => setProgress(audio.currentTime, audio.duration || 0);
    const onEnded = () => next();

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
    };
  }, [next, setProgress]);

  const onSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    seekFromUser.current = true;
    audio.currentTime = value;
    setProgress(value, duration);
    window.setTimeout(() => {
      seekFromUser.current = false;
    }, 80);
  };

  const uploadFile = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { url } = await api<{ url: string }>("/api/upload", {
        method: "POST",
        body: form,
        backend: true,
      });
      const title = file.name.replace(/\.[^.]+$/, "") || "未命名曲目";
      addUploaded({ title, artist: "我的上传", src: url });
      setPanelOpen(true);
    } catch (e) {
      setUploadError((e as Error).message || "上传失败");
    } finally {
      setUploading(false);
    }
  };

  if (!hydrated) return null;

  const ratio = duration > 0 ? progress / duration : 0;
  const builtins = tracks.filter((t) => t.kind === "builtin");
  const uploaded = tracks.filter((t) => t.kind === "uploaded");

  return (
    <div className={styles.root}>
      <audio ref={audioRef} className={styles.audio} preload="metadata" />

      {panelOpen ? (
        <div className={styles.panel}>
          <div className={styles.nowPlaying}>
            <div className={styles.nowMeta}>
              <div className={styles.title}>{current?.title ?? "未选择曲目"}</div>
              <div className={styles.artist}>{current?.artist ?? "—"}</div>
            </div>
            <button
              type="button"
              className={styles.iconBtn}
              title="关闭"
              onClick={() => setPanelOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div className={styles.controls}>
            <button
              type="button"
              className={styles.iconBtn}
              title="上一首"
              onClick={() => prev()}
            >
              <SkipBack size={15} />
            </button>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnPrimary}`}
              title={playing ? "暂停" : "播放"}
              onClick={() => toggle()}
              disabled={!current || pathname.startsWith("/gacha")}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              title="下一首"
              onClick={() => next()}
            >
              <SkipForward size={15} />
            </button>
          </div>

          <div className={styles.progressRow}>
            <span className={styles.time}>{formatTime(progress)}</span>
            <input
              className={styles.seek}
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={Number.isFinite(progress) ? progress : 0}
              onChange={(e) => onSeek(Number(e.target.value))}
              aria-label="播放进度"
              style={{
                background: `linear-gradient(90deg, #249d6d ${(ratio * 100).toFixed(1)}%, #e4e8d4 ${(ratio * 100).toFixed(1)}%)`,
              }}
            />
            <span className={styles.time}>{formatTime(duration)}</span>
          </div>

          <div className={styles.volumeRow}>
            <Volume2 size={14} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="音量"
            />
          </div>

          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>
              <ListMusic size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
              曲库
            </h3>
            <button
              type="button"
              className={styles.uploadBtn}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={13} />
              {uploading ? "上传中…" : "上传"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav,audio/webm,.mp3,.m4a,.aac,.ogg,.wav"
              className={styles.fileInput}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
                e.target.value = "";
              }}
            />
          </div>

          {uploadError ? <p className={styles.error}>{uploadError}</p> : null}
          {pathname.startsWith("/gacha") ? (
            <p className={styles.error}>祈愿页播放专属 BGM，全局音乐已暂停。</p>
          ) : null}

          <p className={styles.sectionLabel}>内置</p>
          <ul className={styles.trackList}>
            {builtins.map((track) => (
              <li key={track.id}>
                <button
                  type="button"
                  className={styles.trackItem}
                  data-active={track.id === current?.id}
                  onClick={() => play(track.id)}
                >
                  <Music2 size={14} />
                  <span className={styles.trackMeta}>
                    <span className={styles.trackTitle}>{track.title}</span>
                    <span className={styles.trackArtist}>{track.artist}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p className={styles.sectionLabel}>我的上传</p>
          {uploaded.length === 0 ? (
            <p className={styles.hint}>还没有上传曲目。支持 MP3 / M4A / OGG / WAV（≤15MB）。</p>
          ) : (
            <ul className={styles.trackList}>
              {uploaded.map((track) => (
                <li key={track.id} className={styles.trackRow}>
                  <button
                    type="button"
                    className={styles.trackItem}
                    data-active={track.id === current?.id}
                    onClick={() => play(track.id)}
                    style={{ flex: 1 }}
                  >
                    <Music2 size={14} />
                    <span className={styles.trackMeta}>
                      <span className={styles.trackTitle}>{track.title}</span>
                      <span className={styles.trackArtist}>{track.artist}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    title="从曲库移除"
                    onClick={() => removeUploaded(track.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className={styles.fab}
        data-playing={playing}
        data-open={panelOpen}
        title={
          panelOpen
            ? "收起播放器"
            : playing
              ? `${current?.title ?? "音乐"} · 点击打开`
              : "打开音乐"
        }
        aria-expanded={panelOpen}
        aria-label={panelOpen ? "收起音乐播放器" : "打开音乐播放器"}
        onClick={() => setPanelOpen(!panelOpen)}
        style={{ "--p": (ratio * 100).toFixed(1) } as CSSProperties}
      >
        {playing ? <span className={styles.fabRing} aria-hidden /> : null}
        {playing ? <Pause size={18} /> : <Music2 size={18} />}
      </button>
    </div>
  );
}
