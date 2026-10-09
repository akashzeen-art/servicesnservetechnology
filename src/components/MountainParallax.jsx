import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const ASSETS = {
  cloud1Mask: 'https://assets.codepen.io/721952/cloud1Mask.jpg',
  sky: 'https://assets.codepen.io/721952/sky.jpg',
  mountBg: 'https://assets.codepen.io/721952/mountBg.png',
  mountMg: 'https://assets.codepen.io/721952/mountMg.png',
  cloud2: 'https://assets.codepen.io/721952/cloud2.png',
  mountFg: 'https://assets.codepen.io/721952/mountFg.png',
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
    at: 0.32,
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
    at: 0.38,
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
    at: 0.44,
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
    at: 0.5,
  },
];

const WELCOME_WORDS = [
  { text: 'Welcome', lang: 'en', dir: 'ltr' },
  { text: 'Bienvenue', lang: 'fr', dir: 'ltr' },
  { text: 'Bienvenido', lang: 'es', dir: 'ltr' },
  { text: 'مرحباً', lang: 'ar', dir: 'rtl' },
  { text: 'स्वागत है', lang: 'hi', dir: 'ltr' },
];

// Timeline positions (the whole scroll is ~1 unit; cards start at 0.32).
const WORD_STEP = 0.065;
const WORD_IN = 0.035;
const WORD_HOLD = 0.012;

const WORD_BACK = { opacity: 0, scale: 0.3, filter: 'blur(12px)' };
const WORD_FRONT = { opacity: 1, scale: 1, filter: 'blur(0px)' };
const WORD_PAST = { opacity: 0, scale: 1.8, filter: 'blur(10px)' };

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
            scrub: 1,
          },
        })
        .fromTo('.sky', { y: 0 }, { y: -200 }, 0)
        .fromTo('.cloud1', { y: 100 }, { y: -800 }, 0)
        .fromTo('.cloud2', { y: -150 }, { y: -500 }, 0)
        .fromTo('.cloud3', { y: -50 }, { y: -650 }, 0)
        .fromTo('.mountBg', { y: -10 }, { y: -100 }, 0)
        .fromTo('.mountMg', { y: -30 }, { y: -250 }, 0)
        .fromTo('.mountFg', { y: -50 }, { y: -600 }, 0)
        .fromTo('.scroll-hint', { opacity: 1 }, { opacity: 0 }, 0)
        .fromTo('.services-backdrop', { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.3 }, 0.24);

      SERVICES.forEach((service) => {
        tl.fromTo(
          `.service-card--${service.id}`,
          fromFor(service),
          { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1, ease: 'power3.out' },
          service.at,
        );
      });

      // Welcome words travel from behind the scene to past the viewer as the user scrolls.
      const words = gsap.utils.toArray('.welcome-word');
      words.forEach((word, i) => {
        if (i === 0) {
          gsap.set(word, WORD_FRONT);
          tl.fromTo(word, WORD_FRONT, { ...WORD_PAST, ease: 'power1.in', duration: WORD_IN }, WORD_HOLD);
          return;
        }
        const start = WORD_HOLD + (i - 1) * WORD_STEP + WORD_IN / 2;
        gsap.set(word, WORD_BACK);
        tl.fromTo(word, WORD_BACK, { ...WORD_FRONT, ease: 'power2.out', duration: WORD_IN }, start).fromTo(
          word,
          WORD_FRONT,
          { ...WORD_PAST, ease: 'power1.in', duration: WORD_IN, immediateRender: false },
          start + WORD_IN + WORD_HOLD,
        );
      });
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
      <div className="scrollDist" />
      <main>
        <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <mask id="m">
            <g className="cloud1">
              <rect fill="#fff" width="100%" height="801" y="799" />
              <image href={ASSETS.cloud1Mask} width="1200" height="800" />
            </g>
          </mask>

          <image className="sky" href={ASSETS.sky} width="1200" height="590" />
          <image className="mountBg" href={ASSETS.mountBg} width="1200" height="800" />
          <image className="mountMg" href={ASSETS.mountMg} width="1200" height="800" />
          <image className="cloud2" href={ASSETS.cloud2} width="1200" height="800" />
          <image className="mountFg" href={ASSETS.mountFg} width="1200" height="800" />
          <image className="cloud1" href={ASSETS.cloud1} width="1200" height="800" />
          <image className="cloud3" href={ASSETS.cloud3} width="1200" height="800" />
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

          <g mask="url(#m)">
            <rect fill="#fff" width="100%" height="100%" />
          </g>

          <rect id="arrow-btn" width="100" height="100" opacity="0" x="550" y="290" style={{ cursor: 'pointer' }} />
        </svg>

        <div className="scene-vignette" aria-hidden="true" />

        <div className="welcome-words">
          {WELCOME_WORDS.map((word) => (
            <span key={word.lang} className="welcome-word" lang={word.lang} dir={word.dir}>
              {word.text}
            </span>
          ))}
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
