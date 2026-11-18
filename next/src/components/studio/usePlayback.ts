"use client";
import { useEffect, useRef, useState } from "react";
export function usePlayback(duration: number) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const clock = useRef({ started: 0, initial: 0 });
  useEffect(() => {
    if (!playing) return;
    clock.current.started = performance.now();
    clock.current.initial = time;
    let frame: number;
    const tick = (now: number) => {
      const next = Math.min(
        duration,
        clock.current.initial + ((now - clock.current.started) / 1000) * speed,
      );
      setTime(next);
      if (next >= duration) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // time is captured once when playback starts or its speed changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, duration]);
  return {
    time,
    playing,
    speed,
    setSpeed,
    pause: () => setPlaying(false),
    seek: (value: number) => {
      setPlaying(false);
      setTime(Math.max(0, Math.min(duration, value)));
    },
    toggle: () => {
      if (time >= duration) setTime(0);
      setPlaying((value) => !value);
    },
  };
}
