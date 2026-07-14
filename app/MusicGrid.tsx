"use client";

import { useRef, useState } from "react";
import Image from "next/image";

export type MusicTrack = {
  title: string;
  artwork: string;
  spotifyUrl: string;
  previewUrl: string;
};

export default function MusicGrid({ tracks }: { tracks: MusicTrack[] }) {
  const [activeTrack, setActiveTrack] = useState<number | null>(null);
  const audioRefs = useRef<Array<HTMLAudioElement | null>>([]);

  async function toggleTrack(index: number) {
    const selected = audioRefs.current[index];
    if (!selected) return;

    if (activeTrack === index && !selected.paused) {
      selected.pause();
      setActiveTrack(null);
      return;
    }

    audioRefs.current.forEach((audio, audioIndex) => {
      if (audio && audioIndex !== index) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    try {
      await selected.play();
      setActiveTrack(index);
    } catch {
      setActiveTrack(null);
    }
  }

  return (
    <div className="music-grid">
      {tracks.map((track, index) => {
        const isPlaying = activeTrack === index;

        return (
          <article className="music-card" key={track.spotifyUrl}>
            <div className="music-artwork">
              <a
                href={track.spotifyUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`${track.title} on Spotify`}
              >
                <Image
                  src={track.artwork}
                  alt={`${track.title} cover artwork`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
                />
              </a>
              <button
                className="music-play"
                type="button"
                onClick={() => toggleTrack(index)}
                aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
              >
                {isPlaying ? (
                  <span className="pause-icon" aria-hidden="true">
                    <i />
                    <i />
                  </span>
                ) : (
                  <span className="play-icon" aria-hidden="true" />
                )}
              </button>
              <audio
                ref={(element) => {
                  audioRefs.current[index] = element;
                }}
                src={track.previewUrl}
                preload="none"
                onEnded={() => setActiveTrack(null)}
              />
            </div>
            <div className="music-meta">
              <h3>{track.title}</h3>
              <a href={track.spotifyUrl} target="_blank" rel="noreferrer">
                Spotify ↗
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
