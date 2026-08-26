"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useMusicPlayer } from "./MusicPlayerProvider";
import { trackEvent } from "./analytics-client";

export type MusicTrack = { title: string; artwork: string; spotifyUrl: string; previewUrl: string };

function shuffleTracks(tracks: MusicTrack[]) {
  const shuffled = [...tracks];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

export default function MusicGrid({ tracks, randomize = false, limit }: { tracks: MusicTrack[]; randomize?: boolean; limit?: number }) {
  const [visibleTracks, setVisibleTracks] = useState(() => tracks.slice(0, limit));
  const { activeTrack, isPlaying, playTrack } = useMusicPlayer();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const nextTracks = randomize ? shuffleTracks(tracks) : [...tracks];
      setVisibleTracks(nextTracks.slice(0, limit));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tracks, limit, randomize]);

  return (
    <div className="music-grid">
      {visibleTracks.map((track) => {
        const isActive = activeTrack?.spotifyUrl === track.spotifyUrl;
        const trackIsPlaying = isActive && isPlaying;
        return (
          <article className="music-card" key={track.spotifyUrl}>
            <div className="music-artwork">
              <a href={track.spotifyUrl} target="_blank" rel="noreferrer" aria-label={`${track.title} on Spotify`}>
                <Image src={track.artwork} alt={`${track.title} cover artwork`} fill sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw" />
              </a>
              <button className="music-play" type="button" onClick={() => { if (!trackIsPlaying) trackEvent("music_play", track.title); playTrack(track, tracks); }} aria-label={trackIsPlaying ? `Pause ${track.title}` : `Play ${track.title}`}>
                {trackIsPlaying ? <span className="pause-icon" aria-hidden="true"><i /><i /></span> : <span className="play-icon" aria-hidden="true" />}
              </button>
            </div>
            <div className="music-meta"><h3>{track.title}</h3><a href={track.spotifyUrl} target="_blank" rel="noreferrer">Spotify ↗</a></div>
          </article>
        );
      })}
    </div>
  );
}
