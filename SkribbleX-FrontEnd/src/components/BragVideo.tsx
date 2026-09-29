"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FaVolumeMute, FaVolumeUp } from "react-icons/fa";
import styles from "@/styles/BragVideo.module.css";

const SRC = "/brag.mp4";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export default function BragVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Only attach the src once the section is near the viewport — keeps the
  // 3 MB file out of the initial page load.
  const [shouldLoad, setShouldLoad] = useState(false);
  const [muted, setMuted] = useState(true);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

  const [inView, setInView] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setShouldLoad(true);
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // Play/pause runs after render, so the src is guaranteed to be attached
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    if (inView && !reducedMotion) {
      video.play().catch(() => {});
    } else if (!video.paused) {
      // Don't burn CPU/battery decoding a video nobody is looking at
      video.pause();
    }
  }, [inView, shouldLoad, reducedMotion]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (!video.muted && video.paused) video.play().catch(() => {});
  };

  return (
    <div className={styles.frame}>
      <video
        ref={videoRef}
        className={styles.video}
        src={shouldLoad ? SRC : undefined}
        preload={shouldLoad ? "auto" : "none"}
        muted
        loop
        playsInline
        controls={reducedMotion}
        disablePictureInPicture
        aria-label="SkribbleX gameplay trailer"
      />
      {!reducedMotion && (
        <button
          type="button"
          className={styles.muteBtn}
          onClick={toggleMute}
          aria-label={muted ? "Unmute video" : "Mute video"}
        >
          {muted ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
      )}
    </div>
  );
}
