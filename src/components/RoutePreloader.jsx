import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow';
import { Globe, IndianRupee, RadioTower, Smartphone } from 'lucide-react';
import useBootProgress from '../hooks/useBootProgress';

const STORY_MS = 5300;
const ROUTE_DELAY_S = 0.3;
const ROUTE_S = 3.8;
const ZOOM_OUT_S = 0.8;
const HOLD_MS = 150;
const SAFETY_TIMEOUT_MS = 10000;

const ease = [0.22, 1, 0.36, 1];

// Equirectangular map window (degrees) and pixels per degree at camera scale 1.
const K = 20;
const LON_MIN = -20;
const LON_MAX = 130;
const LAT_MAX = 50;
const LAT_MIN = -20;
const MAP_W = (LON_MAX - LON_MIN) * K;
const MAP_H = (LAT_MAX - LAT_MIN) * K;

const project = ([lon, lat]) => [(lon - LON_MIN) * K, (LAT_MAX - lat) * K];

/** One stop per nSERVE service, in the order the route reaches them. */
const STOPS = [
  {
    id: 'dcb',
    name: 'DCB',
    full: 'Direct Carrier Billing',
    detail: 'Pay from mobile balance',
    Icon: Smartphone,
    at: [103.82, 1.35],
  },
  {
    id: 'gateway',
    name: 'India Gateway',
    full: 'India Payment Gateway',
    detail: 'UPI · Cards · Checkout',
    Icon: IndianRupee,
    at: [72.88, 19.08],
  },
  {
    id: 'crossborder',
    name: 'Cross Border',
    full: 'Forex & Cross-Border',
    detail: 'FX · Corridors · Liquidity',
    Icon: Globe,
    at: [55.27, 25.2],
  },
  {
    id: 'solutions',
    name: 'Solutions',
    full: 'Telecom Solutions',
    detail: 'VAS · USSD · Mobile Ads',
    Icon: RadioTower,
    at: [31.24, 30.04],
  },
];

/** Waypoints the route travels through (lon, lat). */
const WAYPOINTS = [
  [103.82, 1.35],
  [98, 6.5],
  [88, 9],
  [80.27, 13.08],
  [76.5, 16.5],
  [72.88, 19.08],
  [66, 21],
  [60, 23.5],
  [55.27, 25.2],
  [50, 24],
  [46.7, 24.7],
  [39, 26.5],
  [31.24, 30.04],
];

function ringToD(ring) {
  let d = '';
  ring.forEach((point, i) => {
    const [x, y] = project(point);
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return `${d}Z`;
}

function inWindow(coords) {
  return coords.some(([lon, lat]) => lon > LON_MIN - 10 && lon < LON_MAX + 10 && lat > LAT_MIN - 10 && lat < LAT_MAX + 10);
}

function buildCountries() {
  return am5geodata_worldLow.features
    .filter((f) => f.properties.id !== 'AQ')
    .map((f) => {
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      const rings = polys.map((poly) => poly[0]).filter(inWindow);
      return rings.length ? { id: f.properties.id, d: rings.map(ringToD).join('') } : null;
    })
    .filter(Boolean);
}

/** Smooth, gently meandering path through the waypoints (Catmull-Rom → Bézier). */
function buildRoute() {
  const pts = [];
  WAYPOINTS.forEach((p, i) => {
    pts.push(project(p));
    const next = WAYPOINTS[i + 1];
    if (!next) return;
    const [x1, y1] = project(p);
    const [x2, y2] = project(next);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    const wiggle = len * 0.07 * (i % 2 ? 1 : -1);
    pts.push([(x1 + x2) / 2 + nx * wiggle, (y1 + y2) / 2 + ny * wiggle]);
  });

  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }

  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const bounds = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
  return { d, bounds };
}

function buildGraticule() {
  let d = '';
  for (let lon = LON_MIN; lon <= LON_MAX; lon += 10) {
    const [x] = project([lon, 0]);
    d += `M${x} 0V${MAP_H}`;
  }
  for (let lat = LAT_MIN; lat <= LAT_MAX; lat += 10) {
    const [, y] = project([0, lat]);
    d += `M0 ${y}H${MAP_W}`;
  }
  return d;
}

/**
 * Full-screen route preloader — an orange route draws itself across the map
 * through one stop per nSERVE service while the camera follows the traveller,
 * then zooms out to show the whole journey before handing over to the homepage.
 */
export default function RoutePreloader({ onDone, onReveal, images = [] }) {
  const reducedMotion = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(true);
  const [stageIndex, setStageIndex] = useState(0);

  const worldRef = useRef(null);
  const routeRef = useRef(null);
  const travellerRef = useRef(null);
  const stopRefs = useRef([]);
  const stepsFillRef = useRef(null);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  const map = useMemo(
    () => ({ countries: buildCountries(), route: buildRoute(), graticule: buildGraticule() }),
    [],
  );

  const { progress, complete } = useBootProgress({
    storyMs: STORY_MS,
    timeoutMs: SAFETY_TIMEOUT_MS,
    images,
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const path = routeRef.current;
    const world = worldRef.current;
    const traveller = travellerRef.current;
    const total = path.getTotalLength();

    // Where along the route each stop sits, as a 0–1 fraction.
    const samples = 600;
    const stopFractions = STOPS.map(({ at }) => {
      const [sx, sy] = project(at);
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i <= samples; i += 1) {
        const p = path.getPointAtLength((i / samples) * total);
        const dist = Math.hypot(p.x - sx, p.y - sy);
        if (dist < bestDist) {
          bestDist = dist;
          best = i / samples;
        }
      }
      return best;
    });
    const stopPoints = STOPS.map(({ at }) => project(at));

    const isMobile = window.innerWidth < 640;
    const followScale = isMobile ? 0.8 : 1;
    const { bounds } = map.route;
    // Leave room either side for the stop labels, which are centred on the pins.
    const fitScale = () =>
      Math.min(
        (window.innerWidth - (isMobile ? 130 : 240)) / bounds.w,
        (window.innerHeight * 0.45) / bounds.h,
        1.1,
      );

    const proxy = { t: reducedMotion ? 1 : 0 };
    const start = path.getPointAtLength(0);
    const cam = reducedMotion
      ? { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2, s: fitScale() }
      : { x: start.x, y: start.y, s: followScale * 1.25 };
    const target = { ...cam, s: reducedMotion ? cam.s : followScale, follow: !reducedMotion };
    let reached = 0;

    path.style.strokeDasharray = `${total}`;

    const update = (_time, deltaMs) => {
      const p = path.getPointAtLength(proxy.t * total);
      path.style.strokeDashoffset = `${total * (1 - proxy.t)}`;

      if (target.follow) {
        target.x = p.x;
        target.y = p.y;
      }
      const f = reducedMotion ? 1 : 1 - Math.exp(-(deltaMs || 16) / 140);
      cam.x += (target.x - cam.x) * f;
      cam.y += (target.y - cam.y) * f;
      cam.s += (target.s - cam.s) * f;

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight * 0.48;
      world.style.transform = `translate3d(${cx - cam.x * cam.s}px, ${cy - cam.y * cam.s}px, 0) scale(${cam.s})`;
      traveller.style.transform = `translate3d(${cx + (p.x - cam.x) * cam.s}px, ${cy + (p.y - cam.y) * cam.s}px, 0)`;

      stopPoints.forEach(([x, y], i) => {
        const el = stopRefs.current[i];
        if (el) el.style.transform = `translate3d(${cx + (x - cam.x) * cam.s}px, ${cy + (y - cam.y) * cam.s}px, 0)`;
      });

      // The step track fills between step dots in time with the traveller on the map.
      const seg = Math.max(0, stopFractions.findLastIndex((frac) => proxy.t >= frac));
      const next = stopFractions[seg + 1];
      const within = next === undefined ? 0 : (proxy.t - stopFractions[seg]) / (next - stopFractions[seg]);
      if (stepsFillRef.current) {
        const fill = Math.min(1, (seg + within) / (STOPS.length - 1));
        stepsFillRef.current.style.transform = `scaleX(${fill})`;
      }

      while (reached < STOPS.length && proxy.t >= stopFractions[reached] - 0.002) {
        stopRefs.current[reached]?.classList.add('is-on');
        setStageIndex(reached);
        reached += 1;
      }
    };

    gsap.ticker.add(update);
    update(0, 16);

    const tl = gsap.timeline();
    if (!reducedMotion) {
      tl.to(target, { s: followScale, duration: 0.8, ease: 'power2.out' }, 0)
        .to(proxy, { t: 1, duration: ROUTE_S, ease: 'power1.inOut' }, ROUTE_DELAY_S)
        .add(() => {
          target.follow = false;
        })
        .to(target, {
          x: bounds.x + bounds.w / 2,
          y: bounds.y + bounds.h / 2,
          s: fitScale(),
          duration: ZOOM_OUT_S,
          ease: 'power2.inOut',
        });
    }

    return () => {
      tl.kill();
      gsap.ticker.remove(update);
    };
    // The route is built once; motion preference is read at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!complete) return undefined;
    onRevealRef.current?.();
    const exit = window.setTimeout(() => setVisible(false), HOLD_MS);
    return () => window.clearTimeout(exit);
  }, [complete]);

  return (
    <AnimatePresence
      onExitComplete={() => {
        document.body.style.overflow = '';
        onDone?.();
      }}
    >
      {visible && (
        <motion.div
          className="route-preloader fixed inset-0 z-[100] overflow-hidden bg-[#F5F7FB]"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease }}
          aria-label="Loading nSERVE services"
          aria-busy={!complete}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease }}
          >
            <div ref={worldRef} className="route-world" style={{ width: MAP_W, height: MAP_H }}>
              <svg
                width={MAP_W}
                height={MAP_H}
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                aria-hidden="true"
              >
                <path className="route-graticule" d={map.graticule} />
                {map.countries.map(({ id, d }) => (
                  <path key={id} d={d} className={id === 'IN' ? 'route-land route-land--india' : 'route-land'} />
                ))}
                <path className="route-path-glow" d={map.route.d} />
                <path ref={routeRef} className="route-path" d={map.route.d} />
              </svg>
            </div>

            {STOPS.map(({ id, name, detail, Icon }, i) => (
              <div
                key={id}
                ref={(el) => {
                  stopRefs.current[i] = el;
                }}
                className={`route-stop${i % 2 ? ' route-stop--below' : ''}`}
              >
                <span className="route-stop-pin" />
                <span className="route-stop-label">
                  <span className="route-stop-icon">
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </span>
                  <span className="route-stop-text">
                    <b>{name}</b>
                    <small>{detail}</small>
                  </span>
                </span>
              </div>
            ))}

            <div ref={travellerRef} className="route-traveller" aria-hidden="true">
              <span />
            </div>
          </motion.div>

          <div className="route-vignette" aria-hidden="true" />

          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
            <motion.div
              className="flex flex-col items-center gap-1.5 pt-7 sm:pt-10"
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -28 }}
              transition={{ duration: 0.65, delay: 0.08, ease }}
            >
              <div className="flex items-center gap-3">
                <img
                  src="/nservelogo.png"
                  alt=""
                  className="h-10 sm:h-12 w-auto object-contain"
                  aria-hidden="true"
                />
                <span className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  nSERVE
                </span>
              </div>
              <p className="font-script text-3xl sm:text-4xl text-orange-600 leading-none">
                Digital Meets Direct
              </p>
            </motion.div>

            <div className="flex-1" />
            <motion.div
              className="route-hud"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -24 }}
              transition={{ duration: 0.7, delay: 0.18, ease }}
            >
              <div className="route-hud-status" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={complete ? 'ready' : STOPS[stageIndex].id}
                    initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
                    transition={{ duration: 0.25, ease }}
                  >
                    {complete ? (
                      'All services connected'
                    ) : (
                      <>
                        <span>{String(stageIndex + 1).padStart(2, '0')}</span>
                        {STOPS[stageIndex].full}
                      </>
                    )}
                  </motion.p>
                </AnimatePresence>
                <span className="route-hud-percent">{progress}%</span>
              </div>

              <ol className="route-steps">
                <li className="route-steps-track" aria-hidden="true">
                  <span ref={stepsFillRef} />
                </li>
                {STOPS.map(({ id, name, Icon }, i) => (
                  <li
                    key={id}
                    className={`route-step${i <= stageIndex ? ' is-on' : ''}${
                      i === stageIndex && !complete ? ' is-current' : ''
                    }`}
                  >
                    <span className="route-step-icon">
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <span className="route-step-label">{name}</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
