"use client";

import Image from "next/image";
import { trackEvent } from "./analytics-client";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

export type PlayerTrack = {
  title: string;
  artwork: string;
  spotifyUrl: string;
  previewUrl: string;
};

type MusicPlayerContextValue = {
  activeTrack: PlayerTrack | null;
  isPlaying: boolean;
  playTrack: (track: PlayerTrack, playlist: PlayerTrack[]) => void;
  togglePlayback: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  closePlayer: () => void;
};

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) throw new Error("useMusicPlayer must be used inside MusicPlayerProvider");
  return context;
}

export default function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingTitle = useRef("");
  const [activeTrack, setActiveTrack] = useState<PlayerTrack | null>(null);
  const [playlist, setPlaylist] = useState<PlayerTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const startTrack = useCallback((track: PlayerTrack) => {
    const audio = audioRef.current;
    if (!audio) return;

    playingTitle.current = track.title;
    audio.src = track.previewUrl;
    audio.currentTime = 0;
    setActiveTrack(track);

    void audio.play().then(
      () => setIsPlaying(true),
      () => setIsPlaying(false),
    );
  }, []);

  const playTrack = useCallback(
    (track: PlayerTrack, nextPlaylist: PlayerTrack[]) => {
      const audio = audioRef.current;
      setPlaylist(nextPlaylist);

      if (activeTrack?.spotifyUrl === track.spotifyUrl && audio) {
        if (audio.paused) {
          void audio.play().then(
            () => setIsPlaying(true),
            () => setIsPlaying(false),
          );
        } else {
          audio.pause();
          setIsPlaying(false);
        }
        return;
      }

      startTrack(track);
    },
    [activeTrack, startTrack],
  );

  const nextTrack = useCallback(() => {
    if (!activeTrack || playlist.length === 0) return;
    const index = playlist.findIndex((track) => track.spotifyUrl === activeTrack.spotifyUrl);
    const next = playlist[(index + 1 + playlist.length) % playlist.length];
    if (next) startTrack(next);
  }, [activeTrack, playlist, startTrack]);

  const previousTrack = useCallback(() => {
    if (!activeTrack || playlist.length === 0) return;
    const index = playlist.findIndex((track) => track.spotifyUrl === activeTrack.spotifyUrl);
    const previous = playlist[(index - 1 + playlist.length) % playlist.length];
    if (previous) startTrack(previous);
  }, [activeTrack, playlist, startTrack]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

    if (audio.paused) {
      void audio.play().then(
        () => setIsPlaying(true),
        () => setIsPlaying(false),
      );
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [activeTrack]);

  const closePlayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setActiveTrack(null);
    setIsPlaying(false);
  }, []);

  return (
    <MusicPlayerContext.Provider
      value={{
        activeTrack,
        isPlaying,
        playTrack,
        togglePlayback,
        nextTrack,
        previousTrack,
        closePlayer,
      }}
    >
      {children}
      <audio ref={audioRef} preload="none" onPlay={() => trackEvent("music_play", playingTitle.current)} onEnded={nextTrack} />

      {activeTrack && (
        <aside className="persistent-player" aria-label="Music player">
          <div className="persistent-player-artwork">
            <Image
              src={activeTrack.artwork}
              alt=""
              fill
              sizes="48px"
            />
          </div>
          <div className="persistent-player-info">
            <strong>{activeTrack.title}</strong>
            <a href={activeTrack.spotifyUrl} target="_blank" rel="noreferrer">
              Spotify ↗
            </a>
          </div>
          <div className="persistent-player-controls">
            <button type="button" onClick={previousTrack} aria-label="Previous track">←</button>
            <button
              className="persistent-player-main"
              type="button"
              onClick={togglePlayback}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "Ⅱ" : "▶"}
            </button>
            <button type="button" onClick={nextTrack} aria-label="Next track">→</button>
          </div>
          <button className="persistent-player-close" type="button" onClick={closePlayer} aria-label="Close player">×</button>
        </aside>
      )}
    </MusicPlayerContext.Provider>
  );
}
