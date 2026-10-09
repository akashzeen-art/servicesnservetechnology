import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import * as am5 from '@amcharts/amcharts5';
import * as am5map from '@amcharts/amcharts5/map';
import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow';
import { INDIA_ID } from '../data/indiaLaunchRoutes';
import {
  CROSSBORDER_CORRIDORS,
  CROSSBORDER_HUBS,
  GATEWAY_ORIGINS,
  INDIA_HUB,
  INDIA_METROS,
  PRELOADER_STAGES,
  stageForProgress,
} from '../data/preloaderStages';
import useBootProgress from '../hooks/useBootProgress';
import PreloaderHud from './preloader/PreloaderHud';

const STORY_MS = 4800;
const REVEAL_MS = 350;
const EXIT_MS = 750;
const SAFETY_TIMEOUT_MS = 10000;

const ease = [0.22, 1, 0.36, 1];

const COLOR = {
  ocean: 0x0a1428,
  land: 0x16233d,
  coast: 0x94a3b8,
  india: 0xea580c,
  indiaEdge: 0xfbbf24,
};

/** Route endpoints per stage; the solutions stage lights signal towers instead. */
const STAGE_ROUTES = [
  INDIA_METROS.map((metro) => [INDIA_HUB, metro]),
  Object.values(GATEWAY_ORIGINS).map((origin) => [origin, INDIA_HUB]),
  CROSSBORDER_CORRIDORS.map(([from, to]) => [CROSSBORDER_HUBS[from], CROSSBORDER_HUBS[to]]),
  [],
];

const pointKey = (p) => `${p.latitude},${p.longitude}`;

function createGlobeStory(host, { reducedMotion, onReady }) {
  const root = am5.Root.new(host);
  if (root._logo) root._logo.dispose();

  const timers = [];
  const later = (fn, ms) => timers.push(window.setTimeout(fn, ms));
  const first = PRELOADER_STAGES[0].focus;

  const chart = root.container.children.push(
    am5map.MapChart.new(root, {
      panX: 'none',
      panY: 'none',
      wheelX: 'none',
      wheelY: 'none',
      projection: am5map.geoOrthographic(),
      rotationX: reducedMotion ? first.x : first.x + 40,
      rotationY: first.y,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
    }),
  );

  const ocean = chart.series.push(am5map.MapPolygonSeries.new(root, {}));
  ocean.mapPolygons.template.setAll({
    fill: am5.color(COLOR.ocean),
    fillOpacity: 1,
    strokeOpacity: 0,
  });
  ocean.data.push({ geometry: am5map.getGeoRectangle(90, 180, -90, -180) });

  const graticule = chart.series.push(am5map.GraticuleSeries.new(root, { step: 15 }));
  graticule.mapLines.template.setAll({
    stroke: am5.color(COLOR.coast),
    strokeOpacity: 0.06,
    strokeWidth: 0.6,
  });

  const countries = chart.series.push(
    am5map.MapPolygonSeries.new(root, { geoJSON: am5geodata_worldLow, exclude: ['AQ'] }),
  );
  countries.mapPolygons.template.setAll({
    fill: am5.color(COLOR.land),
    stroke: am5.color(COLOR.coast),
    strokeOpacity: 0.22,
    strokeWidth: 0.5,
  });
  countries.mapPolygons.template.adapters.add('fill', (fill, target) =>
    target.dataItem?.get('id') === INDIA_ID ? am5.color(COLOR.india) : fill,
  );
  countries.mapPolygons.template.adapters.add('stroke', (stroke, target) =>
    target.dataItem?.get('id') === INDIA_ID ? am5.color(COLOR.indiaEdge) : stroke,
  );
  countries.mapPolygons.template.adapters.add('strokeOpacity', (opacity, target) =>
    target.dataItem?.get('id') === INDIA_ID ? 0.9 : opacity,
  );

  const lineSeries = chart.series.push(am5map.MapLineSeries.new(root, {}));
  lineSeries.mapLines.template.setAll({
    templateField: 'lineSettings',
    strokeWidth: 1.6,
    strokeOpacity: 0.85,
  });

  const hubSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
  hubSeries.bullets.push((_root, _series, dataItem) => {
    const color = am5.color(dataItem.get('color'));
    const size = dataItem.get('size') ?? 2.2;
    const container = am5.Container.new(root, { opacity: 0 });
    const ring = container.children.push(
      am5.Circle.new(root, { radius: size, fill: color, fillOpacity: 0.4 }),
    );
    container.children.push(
      am5.Circle.new(root, {
        radius: size,
        fill: am5.color(0xffffff),
        stroke: color,
        strokeWidth: 1.2,
      }),
    );
    container.animate({ key: 'opacity', to: 1, duration: 350 });
    if (!reducedMotion) {
      const reach = dataItem.get('reach') ?? 4;
      ring.animate({ key: 'radius', from: size, to: size * reach, duration: 1500, loops: Infinity });
      ring.animate({ key: 'fillOpacity', from: 0.5, to: 0, duration: 1500, loops: Infinity });
    }
    return am5.Bullet.new(root, { sprite: container });
  });

  const packetSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
  packetSeries.bullets.push((_root, _series, dataItem) =>
    am5.Bullet.new(root, {
      sprite: am5.Circle.new(root, {
        radius: 2.3,
        fill: am5.color(0xffffff),
        shadowColor: am5.color(dataItem.get('color')),
        shadowBlur: 10,
        shadowOpacity: 1,
      }),
    }),
  );

  const placedHubs = new Set();
  const addHub = (point, color, extra = {}, key = pointKey(point)) => {
    if (placedHubs.has(key)) return;
    placedHubs.add(key);
    hubSeries.pushDataItem({ ...point, color, ...extra });
  };
  addHub(INDIA_HUB, '#ea580c', { size: 3.4 });

  const stageLines = PRELOADER_STAGES.map(() => []);
  let packets = [];
  let current = -1;

  const rotateTo = ({ x, y }, duration) => {
    if (reducedMotion) {
      chart.setAll({ rotationX: x, rotationY: y });
      return;
    }
    const easing = am5.ease.inOut(am5.ease.cubic);
    chart.animate({ key: 'rotationX', to: x, duration, easing });
    chart.animate({ key: 'rotationY', to: y, duration, easing });
  };

  const clearPackets = () => {
    packets.forEach((packet) => packetSeries.disposeDataItem(packet));
    packets = [];
  };

  const setStage = (index) => {
    if (index <= current) return;
    current = index;
    const stage = PRELOADER_STAGES[index];

    clearPackets();
    stageLines.forEach((lines) =>
      lines.forEach((line) =>
        line.get('mapLine')?.animate({ key: 'strokeOpacity', to: 0.25, duration: 500 }),
      ),
    );
    rotateTo(stage.focus, 1100);

    STAGE_ROUTES[index].forEach(([from, to], i) => {
      later(
        () => {
          lineSeries.data.push({
            geometry: {
              type: 'LineString',
              coordinates: [
                [from.longitude, from.latitude],
                [to.longitude, to.latitude],
              ],
            },
            lineSettings: { stroke: am5.color(stage.color) },
          });
          const line = lineSeries.dataItems[lineSeries.dataItems.length - 1];
          stageLines[index].push(line);
          addHub(from, stage.color);
          addHub(to, stage.color);
          if (!reducedMotion && current === index) {
            const packet = packetSeries.pushDataItem({
              lineDataItem: line,
              positionOnLine: 0,
              color: stage.color,
            });
            packet.animate({
              key: 'positionOnLine',
              from: 0,
              to: 1,
              duration: 1000 + (i % 3) * 200,
              loops: Infinity,
            });
            packets.push(packet);
          }
        },
        reducedMotion ? 0 : 120 + i * 70,
      );
    });

    if (stage.id === 'solutions') {
      INDIA_METROS.forEach((metro, i) => {
        later(
          () => addHub(metro, stage.color, { size: 2.6, reach: 6 }, `tower:${metro.id}`),
          reducedMotion ? 0 : 150 + i * 110,
        );
      });
    }
  };

  const finish = () => {
    clearPackets();
    stageLines.forEach((lines) =>
      lines.forEach((line) =>
        line.get('mapLine')?.animate({ key: 'strokeOpacity', to: 0.8, duration: 400 }),
      ),
    );
    rotateTo(PRELOADER_STAGES[0].focus, 700);
  };

  root.events.once('frameended', () => onReady());
  chart.appear(900, 0);

  return {
    setStage,
    finish,
    resize: () => root.resize(),
    dispose: () => {
      timers.forEach((id) => window.clearTimeout(id));
      root.dispose();
    },
  };
}

/**
 * Full-screen globe preloader — walks through the four services (DCB → India
 * Gateway → Cross-Border → Solutions) on a rotating globe, then hands over to
 * the homepage once the page has really loaded.
 */
export default function GlobePreloader({ onDone, onReveal, images = [], storyMs = STORY_MS }) {
  const hostRef = useRef(null);
  const storyRef = useRef(null);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;
  const reducedMotion = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(true);
  const [entered, setEntered] = useState(false);

  const { progress, complete, markReady } = useBootProgress({
    storyMs,
    timeoutMs: SAFETY_TIMEOUT_MS,
    images,
    tasks: ['globe'],
  });
  const stageIndex = stageForProgress(progress);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    storyRef.current = createGlobeStory(hostRef.current, {
      reducedMotion,
      onReady: () => markReady('globe'),
    });
    return () => {
      storyRef.current?.dispose();
      storyRef.current = null;
    };
    // The globe is built once; motion preference is read at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    storyRef.current?.setStage(stageIndex);
  }, [stageIndex]);

  // amCharts sizes its canvas from the transformed (mid-scale-in) box and
  // won't re-measure on its own, so resize once the entrance has settled.
  useEffect(() => {
    if (entered) storyRef.current?.resize();
  }, [entered]);

  useEffect(() => {
    if (!complete) return undefined;
    storyRef.current?.finish();
    const reveal = window.setTimeout(() => onRevealRef.current?.(), REVEAL_MS);
    const exit = window.setTimeout(() => setVisible(false), EXIT_MS);
    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(exit);
    };
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
          className="boot-preloader fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-hidden px-6 pb-8 pt-7 sm:pb-12 sm:pt-10"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75, ease }}
          aria-label="Loading nSERVE services"
          aria-busy={!complete}
        >
          <div className="boot-stars" aria-hidden="true" />

          <motion.div
            className="relative flex flex-col items-center gap-1.5"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -24 }}
            transition={{ duration: 0.6, ease }}
          >
            <div className="flex items-center gap-3">
              <img
                src="/nservelogo.png"
                alt=""
                className="h-10 w-auto object-contain sm:h-12"
                aria-hidden="true"
              />
              <span className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                nSERVE
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 sm:text-[11px]">
              Global Services. Local Possibilities.
            </p>
          </motion.div>

          <motion.div
            className="boot-globe"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.25 }}
            transition={{ duration: 0.9, ease }}
            onAnimationComplete={() => setEntered(true)}
          >
            <div className="boot-atmosphere" aria-hidden="true" />
            <div ref={hostRef} className="boot-globe-canvas" aria-hidden="true" />
          </motion.div>

          <motion.div
            className="relative w-full"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.15, ease }}
          >
            <PreloaderHud
              progress={progress}
              stageIndex={stageIndex}
              finished={complete}
              reducedMotion={reducedMotion}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
