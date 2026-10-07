import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';
import { sectionsData as sections } from '../data/sections';

gsap.registerPlugin(ScrollTrigger);

const isMobileDevice = () =>
  /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
  window.innerWidth < 768;

function openService(href) {
  window.open(href, '_blank', 'noopener,noreferrer');
}

function SectionContent({ section, index, titleRef, subtitleRef, btnRef, blob1Ref, blob2Ref }) {
  return (
    <>
      {section.bg && (
        <img
          src={section.bg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
        />
      )}

      <div className="absolute inset-0 pointer-events-none">
        <div
          ref={blob1Ref}
          className="absolute top-10 right-10 w-[400px] h-[400px] rounded-full blur-[100px] bg-white/10"
        />
        <div
          ref={blob2Ref}
          className="absolute bottom-10 left-10 w-80 h-80 rounded-full blur-[80px] bg-white/10"
        />
      </div>

      <span
        className="absolute top-8 left-8 font-black select-none leading-none text-white/[0.06]"
        style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(4rem, 15vw, 8rem)' }}
      >
        0{index + 1}
      </span>

      <div
        onClick={() => openService(section.href)}
        className="relative z-10 text-center px-6 max-w-4xl cursor-pointer"
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') openService(section.href);
        }}
      >
        {index === 0 && (
          <img
            src="/nservelogo.png"
            alt="nSERVE"
            className="absolute -top-20 left-1/2 -translate-x-1/2 h-16 w-auto object-contain opacity-95 drop-shadow-lg"
          />
        )}
        <h1
          ref={titleRef}
          className={`font-black text-transparent bg-clip-text bg-gradient-to-br ${section.titleGradient} whitespace-pre-line leading-tight pb-2 mb-4`}
          style={{ fontSize: 'clamp(2.2rem, 8vw, 5rem)', fontFamily: 'Syne, sans-serif' }}
        >
          {section.title}
        </h1>
        <p
          ref={subtitleRef}
          className="text-base md:text-xl text-white/60 font-light tracking-wide max-w-2xl mx-auto"
        >
          {section.subtitle}
        </p>
      </div>

      <button
        ref={btnRef}
        type="button"
        onClick={() => openService(section.href)}
        className="absolute flex items-center gap-3 bg-white/15 backdrop-blur-md border-2 border-white/40 text-white font-black text-base py-4 px-8 rounded-full active:scale-95"
        style={{
          bottom: '12%',
          right: 0,
          boxShadow:
            '0 0 25px rgba(255,255,255,0.5), 0 0 60px rgba(255,255,255,0.2), inset 0 0 20px rgba(255,255,255,0.05)',
          animation: 'btnFloat 1.8s ease-in-out infinite',
          whiteSpace: 'nowrap',
          zIndex: 20,
        }}
      >
        {section.cta}
        <ArrowRight className="w-5 h-5" />
      </button>

      {index === 0 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 text-xs font-semibold tracking-[0.3em] uppercase"
          style={{ bottom: '30%' }}
        >
          <span>Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/50 to-transparent animate-pulse" />
        </div>
      )}
    </>
  );
}

export default function Sections() {
  const wrapperRef = useRef(null);
  const sectionRefs = useRef([]);
  const titleRefs = useRef([]);
  const subtitleRefs = useRef([]);
  const btnRefs = useRef([]);
  const blob1Refs = useRef([]);
  const blob2Refs = useRef([]);
  const [mobile] = useState(isMobileDevice);

  useEffect(() => {
    if (mobile) return undefined;

    ScrollTrigger.config({ ignoreMobileResize: true });
    ScrollTrigger.getAll().forEach((t) => t.kill());

    const n = sections.length;

    const ctx = gsap.context(() => {
      sectionRefs.current.forEach((section, index) => {
        if (!section || index === 0) return;

        gsap.fromTo(
          section,
          { yPercent: 100 },
          {
            yPercent: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: wrapperRef.current,
              start: `${((index - 1) / Math.max(n - 1, 1)) * 75}% top`,
              end: `${(index / Math.max(n - 1, 1)) * 75}% top`,
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      gsap
        .timeline({ defaults: { ease: 'power4.out' } })
        .fromTo(titleRefs.current[0], { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1 })
        .fromTo(
          subtitleRefs.current[0],
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6 },
          '-=0.4',
        )
        .fromTo(
          btnRefs.current[0],
          { opacity: 0, x: 30 },
          { opacity: 1, x: 0, duration: 0.5 },
          '-=0.3',
        );

      if (window.innerWidth >= 768) {
        sectionRefs.current.forEach((_, i) => {
          const b1 = blob1Refs.current[i];
          const b2 = blob2Refs.current[i];
          if (b1) {
            gsap.to(b1, {
              x: 40,
              y: -40,
              duration: 6 + i,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
            });
          }
          if (b2) {
            gsap.to(b2, {
              x: -30,
              y: 30,
              duration: 7 + i,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
              delay: 1.5,
            });
          }
        });
      }
    }, wrapperRef);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [mobile]);

  if (mobile) {
    return (
      <div
        style={{
          height: '100vh',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {sections.map((section, index) => (
          <div
            key={section.id}
            style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
            className={`relative h-screen w-full bg-gradient-to-br ${section.gradient} flex flex-col items-center justify-center overflow-hidden`}
          >
            <SectionContent section={section} index={index} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} style={{ height: `${sections.length * 100}vh` }}>
      {sections.map((section, index) => (
        <div
          key={section.id}
          ref={(el) => {
            sectionRefs.current[index] = el;
          }}
          className={`sticky top-0 h-screen w-full bg-gradient-to-br ${section.gradient} flex flex-col items-center justify-center overflow-hidden`}
          style={{ zIndex: index + 1 }}
        >
          <SectionContent
            section={section}
            index={index}
            titleRef={(el) => {
              titleRefs.current[index] = el;
            }}
            subtitleRef={(el) => {
              subtitleRefs.current[index] = el;
            }}
            btnRef={(el) => {
              btnRefs.current[index] = el;
            }}
            blob1Ref={(el) => {
              blob1Refs.current[index] = el;
            }}
            blob2Ref={(el) => {
              blob2Refs.current[index] = el;
            }}
          />
        </div>
      ))}
    </div>
  );
}
