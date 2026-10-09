import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MountainParallax, { HOMEPAGE_IMAGES } from './components/MountainParallax';

const RoutePreloader = lazy(() => import('./components/RoutePreloader'));

export default function App() {
  const [booting, setBooting] = useState(true);
  const [homeReady, setHomeReady] = useState(false);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
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

  return (
    <>
      {booting && (
        <Suspense fallback={<div className="fixed inset-0 z-[100] bg-[#0b0a32]" aria-hidden />}>
          <RoutePreloader onDone={finishBoot} onReveal={revealHome} images={HOMEPAGE_IMAGES} />
        </Suspense>
      )}

      <div className={homeReady ? 'visible' : 'invisible'} aria-hidden={booting}>
        {homeReady && <MountainParallax />}
      </div>
    </>
  );
}
