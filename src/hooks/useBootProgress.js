import { useCallback, useEffect, useRef, useState } from 'react';

/** While real resources are still loading, progress waits here (inside the final stage). */
const WAIT_CAP = 96;
/** Fastest the bar may move, in percent per millisecond. */
const MAX_RATE = 0.03;

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (img.decode) img.decode().catch(() => {}).then(resolve);
      else resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

/**
 * Loading progress that follows a minimum story timeline but only reaches 100%
 * once the page has really loaded (window load, fonts, homepage images and any
 * named tasks such as the map). A safety timeout stops a blocked CDN from
 * holding the site hostage.
 */
export default function useBootProgress({ storyMs, timeoutMs, images = [], tasks = [] }) {
  const [progress, setProgress] = useState(0);
  const readyRef = useRef(false);
  const assetsDoneRef = useRef(false);
  const pendingTasksRef = useRef(new Set(tasks));
  const imagesRef = useRef(images);

  const evaluate = useCallback(() => {
    readyRef.current = assetsDoneRef.current && pendingTasksRef.current.size === 0;
  }, []);

  const markReady = useCallback(
    (name) => {
      pendingTasksRef.current.delete(name);
      evaluate();
    },
    [evaluate],
  );

  useEffect(() => {
    let cancelled = false;

    const windowLoaded =
      document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
    const fontsReady = document.fonts?.ready?.catch(() => {}) ?? Promise.resolve();

    Promise.all([windowLoaded, fontsReady, ...imagesRef.current.map(preloadImage)]).then(() => {
      if (cancelled) return;
      assetsDoneRef.current = true;
      evaluate();
    });

    const safety = window.setTimeout(() => {
      assetsDoneRef.current = true;
      pendingTasksRef.current.clear();
      evaluate();
    }, timeoutMs);

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
    };
  }, [evaluate, timeoutMs]);

  useEffect(() => {
    const start = performance.now();
    let last = start;
    let shown = 0;
    let frame = 0;

    const tick = (now) => {
      // rAF timestamps can be slightly earlier than the performance.now() taken at mount.
      const elapsed = Math.max(0, now - start);
      const timeProgress = Math.min(100, (elapsed / storyMs) * 100);
      const target = readyRef.current ? timeProgress : Math.min(timeProgress, WAIT_CAP);
      shown = Math.max(shown, Math.min(target, shown + Math.max(0, now - last) * MAX_RATE));
      last = Math.max(last, now);
      setProgress(Math.floor(shown));
      if (shown < 100) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [storyMs]);

  return { progress, complete: progress >= 100, markReady };
}
