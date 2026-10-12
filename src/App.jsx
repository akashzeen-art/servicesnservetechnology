import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MountainParallax, { HOMEPAGE_IMAGES } from './components/MountainParallax';

const RoutePreloader = lazy(() => import('./components/RoutePreloader'));

const isOnScreen = () => typeof document === 'undefined' || document.visibilityState === 'visible';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [bootKey, setBootKey] = useState(0);
  const [homeReady, setHomeReady] = useState(false);
  // iOS Safari can load the page while it is hidden (top-hit preloading, background tabs);
  // the story would then play out unseen, so it waits until the page is actually on screen.
  const [onScreen, setOnScreen] = useState(isOnScreen);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if (onScreen) return undefined;
    const onVisibility = () => {
      if (isOnScreen()) setOnScreen(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [onScreen]);

  // Pages restored from the back/forward cache skip the boot, so the preloader replays.
  useEffect(() => {
    const onPageShow = (event) => {
      if (!event.persisted) return;
      window.scrollTo(0, 0);
      setOnScreen(isOnScreen());
      setBootKey((key) => key + 1);
      setBooting(true);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const revealHome = useCallback(() => setHomeReady(true), []);

  const finishBoot = useCallback(() => {
    window.scrollTo(0, 0);
    setHomeReady(true);
    setBooting(false);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      ScrollTrigger.refresh();
    });
  }, []);

  const bootCover = <div className="fixed inset-0 z-[100] bg-[#0b0a32]" aria-hidden />;

  return (
    <>
      {booting &&
        (onScreen ? (
          <Suspense fallback={bootCover}>
            <RoutePreloader key={bootKey} onDone={finishBoot} onReveal={revealHome} images={HOMEPAGE_IMAGES} />
          </Suspense>
        ) : (
          bootCover
        ))}

      <div className={homeReady ? 'visible' : 'invisible'} aria-hidden={booting}>
        {homeReady && <MountainParallax />}
      </div>
    </>
  );
}
