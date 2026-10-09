import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollSmoother } from 'gsap/ScrollSmoother';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, ScrollSmoother);

const ASSETS = {
  aerial: '/scene/palm-aerial.webp',
  beach: '/scene/dubai-beach.jpg',
  cloud2: 'https://assets.codepen.io/721952/cloud2.png',
  cloud1: 'https://assets.codepen.io/721952/cloud1.png',
  cloud3: 'https://assets.codepen.io/721952/cloud3.png',
};

const SERVICES = [
  {
    id: 'dcb',
    kicker: '01 · Carrier Billing',
    title: 'DCB',
    copy: 'Direct Carrier Billing — let users pay for digital services straight from their mobile balance.',
    tags: ['Telco', 'Mobile', 'Subscriptions'],
    href: 'https://dcb.nservetechnology.com/',
    cta: 'View More',
    image: '/cards/DCB%20Mobile%20Payment%20Connections.png',
    from: { x: -900, y: 520, rotate: -18 },
    fromMobile: { x: -260, y: 420, rotate: -12 },
    at: 0.62,
  },
  {
    id: 'gateway',
    kicker: '02 · Payment Gateway',
    title: 'India Gateway',
    copy: 'Accept payments the way India prefers — UPI, cards, wallets and hosted checkout.',
    tags: ['UPI', 'Cards', 'Checkout'],
    href: 'https://gateways.nservetechnology.com/',
    cta: 'View More',
    image: '/cards/tajmahal.png',
    from: { x: -640, y: 520, rotate: -14 },
    fromMobile: { x: -220, y: 420, rotate: -10 },
    at: 0.68,
  },
  {
    id: 'crossborder',
    kicker: '03 · Cross Border',
    title: 'FOREX repatriation Enabler',
    copy: 'Move value worldwide with corridor coverage, currency liquidity and compliance-ready flows.',
    tags: ['FX', 'Corridors', 'Liquidity'],
    href: 'https://payments.nservetechnology.com/',
    cta: 'View More',
    image: '/cards/crossborder.png',
    from: { x: 640, y: 520, rotate: 14 },
    fromMobile: { x: 220, y: 420, rotate: 10 },
    at: 0.74,
  },
  {
    id: 'solutions',
    kicker: '04 · Solutions',
    title: 'Solutions',
    copy: 'Telecom solutions for operators — offers enablement, core VAS, digital services and mobile advertising.',
    tags: ['VAS', 'USSD', 'Mobile Ads'],
    href: 'https://solutions.nservetechnology.com/',
    cta: 'View More',
    image: '/cards/Telecom%20Solutions%20Hub%20Infographic.png',
    from: { x: 900, y: 520, rotate: 18 },
    fromMobile: { x: 260, y: 420, rotate: 12 },
    at: 0.8,
  },
];

// Greetings that take over from "Welcome", one per scroll step, while descending over the Palm.
const DESCENT_WORDS = [
  { text: 'Bienvenue', lang: 'fr', dir: 'ltr' },
  { text: 'Bienvenido', lang: 'es', dir: 'ltr' },
  { text: 'مرحباً', lang: 'ar', dir: 'rtl' },
];

// Timeline positions (the whole scroll is ~1.3 units): "Welcome" leaves at 0.03, each descent
// greeting gets a 0.1 step from 0.05, the beach lands at 0.36 with the Hindi greeting at 0.4,
// then the cards from 0.62.
const DESCENT_END = 0.4;
const LAND_AT = 0.36;
const WORD_FIRST = 0.05;
const WORD_STEP = 0.1;
const WORD_IN = 0.055;
const WORD_OUT = 0.045;
const WORD_OVERLAP = 0.03;
const HINDI_AT = LAND_AT + 0.04;
const HINDI_IN = 0.08;

const WORD_ABOVE = { y: '-22vh', opacity: 0, scale: 0.92 };
const WORD_SHOWN = { y: 0, opacity: 1, scale: 1 };
const WORD_BELOW = { y: '18vh', opacity: 0, scale: 1.06 };

// Seconds after mount (the preloader is still fading out) before "Welcome" starts gliding down.
const INTRO_DELAY_S = 0.2;
const INTRO_S = 1.3;

// Drops rising behind each card; x is % of the card column, s is size as % of its width.
const LIQUID_DROPS = [
  { x: 34, s: 58, d: 9 },
  { x: 66, s: 44, d: 11.5 },
  { x: 48, s: 32, d: 7 },
  { x: 58, s: 26, d: 13 },
];

export const HOMEPAGE_IMAGES = [
  ...Object.values(ASSETS),
  ...SERVICES.map((service) => service.image),
  '/nservelogo.png',
];

export default function MountainParallax() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const ctx = gsap.context(() => {
      const isMobile = window.matchMedia('(max-width: 720px)').matches;
      const fromFor = (service) => ({
        ...(isMobile ? service.fromMobile : service.from),
        opacity: 0,
        scale: 0.88,
      });

      // Wheel and trackpad scrolling glide with inertia instead of jumping in steps.
      ScrollSmoother.create({
        wrapper: '.smooth-wrapper',
        content: '.smooth-content',
        smooth: 1.4,
        smoothTouch: 0.1,
      });

      gsap.set('.services', { xPercent: -50, yPercent: -50 });
      SERVICES.forEach((service) => gsap.set(`.service-card--${service.id}`, fromFor(service)));
      gsap.from('.brand-bar', { y: -24, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.15 });
      gsap.from('.scroll-hint', { y: 16, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.45 });

      const tl = gsap
        .timeline({
          scrollTrigger: {
            trigger: '.scrollDist',
            start: '0 0',
            end: '100% 100%',
            scrub: 0.6,
          },
        })
        // Descend from orbit over the Palm: the photo zooms in while cloud layers rush past.
        .fromTo(
          '.scene-aerial',
          { scale: 1 },
          { scale: 2.6, ease: 'power1.in', duration: DESCENT_END },
          0,
        )
        .fromTo('.cloud1', { y: 100 }, { y: -900, ease: 'none', duration: DESCENT_END }, 0)
        .fromTo('.cloud2', { y: -150 }, { y: -700, ease: 'none', duration: DESCENT_END }, 0)
        .fromTo('.cloud3', { y: -50 }, { y: -800, ease: 'none', duration: DESCENT_END }, 0)
        .to('.scene-clouds', { opacity: 0, ease: 'none', duration: 0.06 }, DESCENT_END - 0.04)
        .fromTo('.scroll-hint, .arrow', { opacity: 1 }, { opacity: 0, duration: 0.06 }, 0)
        // A bright haze hides the cut from the aerial shot to the beach.
        .fromTo('.scene-haze', { opacity: 0 }, { opacity: 0.92, ease: 'power1.in', duration: 0.06 }, LAND_AT - 0.06)
        .to('.scene-haze', { opacity: 0, ease: 'power1.out', duration: 0.08 }, LAND_AT)
        .fromTo('.scene-beach', { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.01 }, LAND_AT - 0.01)
        .fromTo('.scene-beach', { scale: 1.35 }, { scale: 1, ease: 'power2.out', duration: 0.12 }, LAND_AT)
        .to('.scene-aerial', { opacity: 0, duration: 0.01 }, LAND_AT)
        .to('.scene-beach', { scale: 1.08, ease: 'none', duration: 0.4 }, LAND_AT + 0.12)
        .fromTo('.services-backdrop', { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.1 }, 0.58);

      SERVICES.forEach((service) => {
        tl.fromTo(
          `.service-card--${service.id}`,
          fromFor(service),
          { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1, ease: 'power3.out' },
          service.at,
        );
      });

      // "Welcome" glides down from the top centre on its own; the slot carries that intro so the
      // scroll tweens on the word itself never fight it.
      gsap.fromTo(
        '.welcome-slot--intro',
        { y: '-38vh', opacity: 0 },
        { y: 0, opacity: 1, duration: INTRO_S, ease: 'power2.out', delay: INTRO_DELAY_S },
      );
      gsap.set('.welcome-word--en', WORD_SHOWN);

      // Each scroll step slides the current greeting down and out while the next one settles in.
      const outro = (word, at) =>
        tl.fromTo(
          word,
          WORD_SHOWN,
          { ...WORD_BELOW, ease: 'sine.in', duration: WORD_OUT, immediateRender: false },
          at,
        );
      outro('.welcome-word--en', WORD_FIRST - WORD_OVERLAP);
      gsap.utils.toArray('.welcome-word--descent').forEach((word, i) => {
        const start = WORD_FIRST + i * WORD_STEP;
        tl.fromTo(word, WORD_ABOVE, { ...WORD_SHOWN, ease: 'sine.out', duration: WORD_IN }, start);
        outro(word, start + WORD_STEP - WORD_OVERLAP);
      });

      // The Hindi greeting settles onto the beach and stays.
      tl.fromTo(
        '.welcome-word--hi',
        WORD_ABOVE,
        { ...WORD_SHOWN, ease: 'back.out(1.2)', duration: HINDI_IN },
        HINDI_AT,
      );
    }, root);

    const arrowBtn = root.querySelector('#arrow-btn');
    const onEnter = () => {
      gsap.to('.arrow', { y: 10, duration: 0.8, ease: 'back.inOut(3)', overwrite: 'auto' });
    };
    const onLeave = () => {
      gsap.to('.arrow', { y: 0, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
    };
    const onClick = () => {
      gsap.to(window, { scrollTo: 'max', duration: 1.5, ease: 'power1.inOut' });
    };

    arrowBtn?.addEventListener('mouseenter', onEnter);
    arrowBtn?.addEventListener('mouseleave', onLeave);
    arrowBtn?.addEventListener('click', onClick);

    return () => {
      arrowBtn?.removeEventListener('mouseenter', onEnter);
      arrowBtn?.removeEventListener('mouseleave', onLeave);
      arrowBtn?.removeEventListener('click', onClick);
      ctx.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="northface">
      {/* Only the scroll spacer goes through the smoother; the fixed scene must stay outside
          its transformed content or it would scroll away. */}
      <div className="smooth-wrapper">
        <div className="smooth-content">
          <div className="scrollDist" />
        </div>
      </div>
      <main>
        <img className="scene-photo scene-beach" src={ASSETS.beach} alt="" />
        <img className="scene-photo scene-aerial" src={ASSETS.aerial} alt="" />

        <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <linearGradient id="cloud-fade-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" />
            <stop offset="12%" stopColor="#fff" />
            <stop offset="70%" stopColor="#fff" />
            <stop offset="100%" stopColor="#000" />
          </linearGradient>
          <mask id="cloud-fade" maskContentUnits="objectBoundingBox">
            <rect width="1" height="1" fill="url(#cloud-fade-grad)" />
          </mask>
          <g className="scene-clouds">
            <image className="cloud2" href={ASSETS.cloud2} width="1200" height="800" mask="url(#cloud-fade)" />
            <image className="cloud1" href={ASSETS.cloud1} width="1200" height="800" mask="url(#cloud-fade)" />
            <image className="cloud3" href={ASSETS.cloud3} width="1200" height="800" mask="url(#cloud-fade)" />
          </g>
          <defs>
            <linearGradient id="arrow-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>
          <polyline
            className="arrow"
            fill="url(#arrow-grad)"
            points="599,318 599,357 590,347 590,350 600,360 610,350 610,347 601,357 601,318"
          />

          <rect id="arrow-btn" width="100" height="100" opacity="0" x="550" y="290" style={{ cursor: 'pointer' }} />
        </svg>

        <div className="scene-haze" aria-hidden="true" />
        <div className="scene-vignette" aria-hidden="true" />

        <div className="welcome-words">
          <div className="welcome-slot welcome-slot--intro">
            <span className="welcome-word welcome-word--en" lang="en">
              Welcome
            </span>
          </div>
          {DESCENT_WORDS.map((word) => (
            <span key={word.lang} className="welcome-word welcome-word--descent" lang={word.lang} dir={word.dir}>
              {word.text}
            </span>
          ))}
          <span className="welcome-word welcome-word--hi" lang="hi">
            स्वागत है
          </span>
        </div>

        <div className="services-backdrop" aria-hidden="true">
          {SERVICES.map((service) => (
            <span key={service.id} className={`services-blob services-blob--${service.id}`} />
          ))}
          <svg className="liquid-defs" width="0" height="0" focusable="false">
            <filter id="liquid-goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
            </filter>
          </svg>
          <div className="liquid">
            {SERVICES.map((service, col) => (
              <div key={service.id} className={`liquid-col liquid-col--${service.id}`}>
                {LIQUID_DROPS.map((drop, i) => (
                  <span
                    key={i}
                    className="liquid-drop"
                    style={{
                      '--x': `${drop.x}%`,
                      '--s': drop.s,
                      '--d': `${drop.d}s`,
                      '--delay': `${-(i * 2.3 + col * 1.7)}s`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <header className="brand-bar">
          <img src="/nservelogo.png" alt="" />
          <div>
            <strong>nSERVE</strong>
            <span>Where Digital Meets Direct</span>
          </div>
        </header>

        <p className="scroll-hint">
          Scroll to choose a path
          <i />
        </p>

        <div className="services" aria-label="nSERVE services">
          {SERVICES.map((service) => (
            <a
              key={service.id}
              className={`service-card service-card--${service.id}`}
              href={service.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className={`service-media${service.image ? '' : ' service-media--placeholder'}`}>
                {service.image ? <img src={service.image} alt="" /> : <span>{service.title}</span>}
              </div>
              <div className="service-body">
                <span className="service-kicker">{service.kicker}</span>
                <strong>{service.title}</strong>
                <p>{service.copy}</p>
                <div className="service-tags">
                  {service.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <span className="service-cta">
                  {service.cta}
                  <em>→</em>
                </span>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
