import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { pathCardsData as data } from '../data/pathCards';

gsap.registerPlugin(ScrollTrigger);

function splitElementChars(el) {
  const text = el.textContent ?? '';
  el.textContent = '';
  const chars = [];
  for (const ch of text) {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    el.appendChild(span);
    chars.push(span);
  }
  return chars;
}

export default function PathCards() {
  const mainRef = useRef(null);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return undefined;

    const ctx = gsap.context(() => {
      const codeDivs = main.querySelectorAll('code.path-code');
      const splitGroups = [];
      const hasWritten = [];

      codeDivs.forEach((codeDiv, i) => {
        hasWritten[i] = false;
        const tps = [...codeDiv.querySelectorAll('.tp')];
        const splits = tps.map((tp) => {
          const chars = splitElementChars(tp);
          gsap.set(chars, { opacity: 0 });
          return chars;
        });
        splitGroups[i] = splits;

        ScrollTrigger.create({
          trigger: codeDiv,
          start: 'top bottom-=100',
          onEnter: () => writeText(i, 0),
        });
      });

      function writeText(i, j) {
        if (hasWritten[i] || j >= splitGroups[i].length) {
          hasWritten[i] = true;
          return;
        }

        const chars = splitGroups[i][j];
        gsap
          .timeline({
            onComplete: () => {
              const next = j + 1;
              if (splitGroups[i][next]) writeText(i, next);
              else hasWritten[i] = true;
            },
          })
          .set(chars, {
            opacity: 1,
            stagger: 0.01,
          });
      }

      // Header typewriter
      const headers = main.querySelectorAll('header.path-header .tp');
      headers.forEach((header) => {
        const chars = splitElementChars(header);
        gsap.set(chars, { opacity: 0 });
        ScrollTrigger.create({
          trigger: header.closest('.cardWrapper'),
          start: 'top bottom-=80',
          onEnter: () => {
            gsap.to(chars, { opacity: 1, stagger: 0.02, duration: 0.01 });
          },
        });
      });

      gsap.set(main, { autoAlpha: 1 });

      ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress;
          const tabletVerMovement = 0.65 * window.innerHeight;
          const scrollProgress = -(2400 * progress);
          const scrollProgress2 = `${-parseInt(tabletVerMovement * progress, 10)}px`;
          document.body.style.setProperty('--strokeDashoffset', String(scrollProgress));
          document.body.style.setProperty('--tabletVerticaloffset', scrollProgress2);
        },
      });
    }, main);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <nav className="path-nav">
        <div className="path-nav-brand">
          <img src="/nservelogo.png" alt="" />
          <span>nSERVE</span>
        </div>
        <div className="path-nav-links">
          <a href="https://gateway.nserve.co/" target="_blank" rel="noopener noreferrer">
            Gateway
          </a>
          <a href="http://payments.nserve.co/" target="_blank" rel="noopener noreferrer">
            Cross Border
          </a>
        </div>
      </nav>

      <main className="path-main" ref={mainRef}>
        <div className="cards">
          {data.map((card) => (
            <div className="cardWrapper" key={card.id}>
              {card.href ? (
                <a
                  className={`card card--link card--${card.id}`}
                  id={card.id}
                  href={card.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={card.cta || card.title || card.id}
                >
                  <CardInner card={card} />
                </a>
              ) : (
                <div className={`card card--${card.id}`} id={card.id}>
                  <CardInner card={card} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div id="world3d">
          <div id="tablet" />
        </div>

        <svg
          id="svgPaths"
          width="740"
          height="2000"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <use href="#linePath01" />
          <use href="#linePath02" />
          <use href="#linePath03" />
          <use href="#linePath04" />
        </svg>
      </main>

      <SvgDefs />
    </>
  );
}

function CardInner({ card }) {
  if (card.kind === 'header') {
    return (
      <header className="path-header type">
        <span className="tp">{card.title}</span>
      </header>
    );
  }

  return (
    <>
      <code className="path-code type">
        <dl>
          {card.lines.map((line, idx) =>
            line.type === 'dd' ? (
              <dd key={`${card.id}-${idx}`}>
                <span className="tp">{line.text}</span>
              </dd>
            ) : (
              <dt key={`${card.id}-${idx}`}>
                <span className="tp">{line.text || ' '}</span>
              </dt>
            ),
          )}
        </dl>
      </code>
      {card.cta ? <span className="path-cta">{card.cta}</span> : null}
    </>
  );
}

function SvgDefs() {
  return (
    <svg width="0" height="0" role="none" aria-hidden="true" className="path-defs">
      <defs>
        <path
          id="linePath01"
          d="m 106,45h 375c 114,0 226,128 226,235v 236c 0,136 -122,222 -224,221l -182,-2c -89,1 -141,42 -142,158l -2,204c -1,117 37,173 134,173h 186c 110,-3 230,111 230,220v 242c 0,113 -125,225 -248,225H 105"
        />
        <path
          id="linePath02"
          d="m 33,85h 444c 96,0 190,107 190,201v 224c 0,116 -98,188 -190,187l -192,-2c -92,0 -166,75 -166,168v 278c 0,94 74,169 166,169h 194c 92,0 188,94 188,188v 228c 0,94 -104,191 -214,191H 105"
        />
        <path
          id="linePath03"
          d="m 155,127h 308c 94,0 162,86 162,177v 178c 0,109 -50,174 -166,173L 277,653C 158,653 77,762 77,849v 302c 0,118 107,196 180,197l 204,4c 92,0 164,67 164,160v 200c 0,91 -89,163 -188,163H 105"
        />
        <path
          id="linePath04"
          d="m 283,173c 2,0 165,0 165,0C 544,175 577,238 577,330v 156c 0,94 -48,126 -140,125L 269,609C 167,602 29,702 29,851v 312c 0,111 101,235 242,235h 162c 109,1 144,49 144,136v 162c 0,73 -53,130 -118,130l -353,1"
        />

        <path
          id="codepenIcon"
          fill="#FFFFFF"
          d="m 214,306 -57,37c -1,0 -2,2 -2,3v 40c 0,1 1,2 2,3l 57,40c 2,1 6,1 7,0l 58,-40c 1,0 2,-1 2,-3v -40c 0,-2 -2,-3 -2,-3l -57,-37c -4,-3 -8,0 -8,0zm -2,13 1,26 -24,16 -19,-14zm 10,0 43,28 -19,14 -24,-16zm -6,35 19,14 -19,14 -19,-14zm -52,3 14,9 -14,9zm 106,0v 19l -14,-9zm -84,15 24,16v 26l -42,-28zm 59,0 17,14 -42,28v -26z"
        />
        <path
          id="htmlIcon"
          fill="#FFFFFF"
          d="m 94,318v 109h 16v -47h 12v 47h 16V 318h -16v 45h -12v -45zm 47,0v 18h 14v 92h 15v -92h 14v -18zm 45,0v 109h 15v -54l 7,41h 12l 5,-42v 55h 15V 318h -16l -11,72 -11,-72zm 62,0 1,109h 34v -19h -19v -91z"
        />
        <path
          id="cssIcon"
          fill="#FFFFFF"
          d="m 94,398c 0,26 18,31 30,31 9,0 32,-3 31,-34h -19c 0,23 -22,21 -22,0v -43c 0,-25 22,-21 22,1h 18c 1,-32 -22,-35 -30,-35 -10,0 -30,3 -30,32zm 105,-1c 0,22 -23,18 -23,-2h -18c 0,0 1,33 30,33 9,0 30,-4 30,-31 0,-42 -39,-26 -39,-50 0,-16 22,-20 22,3h 18c -2,-21 -11,-31 -30,-31 -9,0 -28,0 -29,28 -1,40 39,23 39,50zm 62,0c 0,21 -22,22 -23,-2h -17c 0,0 0,33 30,33 18,0 30,-9 30,-31 0,-41 -39,-27 -39,-50 0,-15 22,-20 22,3h 18c -1,-22 -13,-31 -27,-31 -11,0 -32,1 -33,27 1,38 39,25 39,51z"
        />
        <path
          id="jsIcon"
          fill="#FFFFFF"
          d="m 262,395c 0,20 -22,20 -22,-1h -18c 0,14 5,31 28,31 16,0 30,-9 30,-31 0,-41 -39,-26 -39,-49 0,-16 20,-19 20,3h 18c -1,-27 -14,-30 -27,-30 -19,-1 -29,8 -29,27 -2,38 39,24 39,50zm -67,-76v 74c 0,22 -22,20 -22,-1h -19c -1,26 15,34 30,34 27,0 30,-20 30,-30v -77z"
        />

        <mask id="block">
          <path fill="#FFFFFF" d="M 0,0 H 300 V 450 H 0 Z" />
        </mask>
        <mask id="codepenMask">
          <use href="#codepenIcon" />
        </mask>
        <mask id="htmlMask">
          <use href="#htmlIcon" />
        </mask>
        <mask id="cssMask">
          <use href="#cssIcon" />
        </mask>
        <mask id="jsMask">
          <use href="#jsIcon" />
        </mask>
        <mask id="codepenMask2">
          <use href="#codepenIcon" stroke="#FFFFFF" strokeWidth="4" />
        </mask>
        <mask id="htmlMask2">
          <use href="#htmlIcon" stroke="#FFFFFF" strokeWidth="4" />
        </mask>
        <mask id="cssMask2">
          <use href="#cssIcon" stroke="#FFFFFF" strokeWidth="4" />
        </mask>
        <mask id="jsMask2">
          <use href="#jsIcon" stroke="#FFFFFF" strokeWidth="4" />
        </mask>

        <linearGradient id="cl1" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="1">
          <stop offset="20%" stopColor="#b169db" />
          <stop offset="45%" stopColor="#f7d152" />
          <stop offset="65%" stopColor="#46cf71" />
          <stop offset="85%" stopColor="#0fbffa" />
          <stop offset="100%" stopColor="#0fbffa" />
        </linearGradient>
      </defs>
    </svg>
  );
}
