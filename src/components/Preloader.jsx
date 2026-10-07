import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function Preloader({ onComplete }) {
  const wrapperRef = useRef(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleDone = () => {
      gsap.to(wrapperRef.current, {
        opacity: 0,
        duration: 0.7,
        ease: 'power2.inOut',
        onComplete: () => {
          setVisible(false);
          onComplete();
        },
      });
    };

    const timer = window.setTimeout(handleDone, 1600);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center gap-6 overflow-hidden"
    >
      <img src="/nservelogo.png" alt="nSERVE" className="h-24 w-auto object-contain animate-pulse" />
      <p
        className="text-white/50 text-xs tracking-[0.35em] uppercase font-semibold"
        style={{ fontFamily: 'Syne, sans-serif' }}
      >
        Loading services
      </p>
    </div>
  );
}
