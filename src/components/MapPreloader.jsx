import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import * as am5 from '@amcharts/amcharts5';
import * as am5map from '@amcharts/amcharts5/map';
import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import {
  originMarkets,
  INDIA_ID,
  indiaLaunchRoutes,
  countryNames,
  corridorLabels,
  PRIMARY_CORRIDORS,
} from '../data/indiaLaunchRoutes';
import { INDIA_HUB, stageForProgress } from '../data/preloaderStages';
import useBootProgress from '../hooks/useBootProgress';
import { createMapStory } from './preloader/mapStory';
import PreloaderHud from './preloader/PreloaderHud';

const ORIGIN_IDS = originMarkets.map((m) => m.id);
const MOBILE_LABEL_IDS = new Set([INDIA_ID, 'GB', 'SG', 'AU']);

const ease = [0.22, 1, 0.36, 1];

const STORY_MS = 5000;
const CONVERGE_MS = 700;
const HOLD_MS = 550;
const SAFETY_TIMEOUT_MS = 10000;

/**
 * Full-screen map preloader — tells the four-vertical story (DCB → India
 * Gateway → Cross-Border → Solutions) on the Mercator world map, then hands
 * over to the homepage once the page has really loaded.
 */
export default function MapPreloader({ onDone, onReveal, images = [], storyMs = STORY_MS }) {
  const hostRef = useRef(null);
  const storyRef = useRef(null);
  const stageRef = useRef(0);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;
  const reducedMotion = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(true);
  const [finished, setFinished] = useState(false);

  const { progress, complete, markReady } = useBootProgress({
    storyMs,
    timeoutMs: SAFETY_TIMEOUT_MS,
    images,
    tasks: ['map'],
  });
  const stageIndex = stageForProgress(progress);
  stageRef.current = stageIndex;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (!hostRef.current) return undefined;

    const isMobile = window.innerWidth < 640;
    const root = am5.Root.new(hostRef.current);
    if (root._logo) root._logo.dispose();

    const nserveTheme = am5.Theme.new(root);
    nserveTheme.rule('InterfaceColors').setAll({
      primaryButton: am5.color(0xea580c),
      primaryButtonHover: am5.color(0xc2410c),
      primaryButtonDown: am5.color(0x9a3412),
      primaryButtonActive: am5.color(0xf97316),
      primaryButtonText: am5.color(0xffffff),
      secondaryButton: am5.color(0xe2e8f0),
      secondaryButtonHover: am5.color(0xcbd5e1),
      secondaryButtonDown: am5.color(0x94a3b8),
      secondaryButtonText: am5.color(0x0f172a),
      background: am5.color(0xf5f7fb),
      text: am5.color(0x0f172a),
    });

    root.setThemes([am5themes_Animated.new(root), nserveTheme]);

    root.container.set(
      'background',
      am5.Rectangle.new(root, {
        fill: am5.color(0xf5f7fb),
        fillGradient: am5.LinearGradient.new(root, {
          stops: [
            { color: am5.color(0xf8fafc) },
            { color: am5.color(0xeef2f7) },
            { color: am5.color(0xe8eef5) },
          ],
          rotation: 145,
        }),
      }),
    );

    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        panX: 'none',
        panY: 'none',
        wheelable: false,
        projection: am5map.geoMercator(),
        homeGeoPoint: { longitude: 40, latitude: 18 },
        homeZoomLevel: 1.05,
        maxZoomLevel: 12,
        minZoomLevel: 0.8,
        paddingTop: 36,
        paddingBottom: 110,
        paddingLeft: 12,
        paddingRight: 12,
      }),
    );

    const bgSeries = chart.series.push(am5map.MapPolygonSeries.new(root, {}));
    bgSeries.mapPolygons.template.setAll({
      fill: am5.color(0xdce6f0),
      fillOpacity: 0,
      strokeOpacity: 0,
    });
    bgSeries.data.push({ geometry: am5map.getGeoRectangle(90, 180, -90, -180) });

    const graticuleSeries = chart.series.push(am5map.GraticuleSeries.new(root, {}));
    graticuleSeries.mapLines.template.setAll({
      stroke: am5.color(0x94a3b8),
      strokeOpacity: 0.14,
      strokeWidth: 0.45,
    });

    const polygonSeries = chart.series.push(
      am5map.MapPolygonSeries.new(root, {
        geoJSON: am5geodata_worldLow,
        exclude: ['AQ'],
      }),
    );

    polygonSeries.mapPolygons.template.setAll({
      fill: am5.color(0xcbd5e1),
      stroke: am5.color(0x94a3b8),
      strokeWidth: 0.35,
      strokeOpacity: 0.4,
      fillOpacity: 0.92,
    });

    // India is the hub from the first frame; origin markets are tinted as
    // their corridor is revealed in the cross-border stage.
    polygonSeries.events.on('datavalidated', () => {
      const poly = polygonSeries.getDataItemById(INDIA_ID)?.get('mapPolygon');
      poly?.setAll({
        fill: am5.color(0xea580c),
        stroke: am5.color(0xfbbf24),
        strokeWidth: 1.6,
        strokeOpacity: 1,
        fillOpacity: 1,
      });
    });

    // Soft country labels (no marker circle on India — shape fill is enough)
    const labelSeries = chart.series.push(
      am5map.MapPointSeries.new(root, {
        polygonIdField: 'id',
      }),
    );

    labelSeries.bullets.push((_, __, dataItem) => {
      const label = am5.Label.new(root, {
        text: '{name}',
        populateText: true,
        centerX: am5.p50,
        centerY: am5.p50,
        fontSize: 10,
        fontWeight: '700',
        fill: am5.color(0x0f172a),
        opacity: dataItem.dataContext?.id === INDIA_ID ? 1 : 0,
        background: am5.RoundedRectangle.new(root, {
          fill: am5.color(0xffffff),
          fillOpacity: 0.88,
          cornerRadiusTL: 5,
          cornerRadiusTR: 5,
          cornerRadiusBL: 5,
          cornerRadiusBR: 5,
          stroke: am5.color(0xe2e8f0),
          strokeWidth: 1,
        }),
        paddingTop: 2,
        paddingBottom: 2,
        paddingLeft: 6,
        paddingRight: 6,
      });
      return am5.Bullet.new(root, { sprite: label });
    });

    labelSeries.data.setAll(
      [INDIA_ID, ...PRIMARY_CORRIDORS]
        .filter((id) => !isMobile || MOBILE_LABEL_IDS.has(id))
        .map((id) => ({
          id,
          name: id === INDIA_ID ? 'INDIA' : corridorLabels[id] ?? countryNames[id],
        })),
    );

    const sankeySeries = chart.series.push(
      am5map.MapSankeySeries.new(root, {
        polygonSeries,
        maxWidth: 3.2,
        controlPointDistance: 0.42,
        resolution: 64,
        nodePadding: 0.32,
      }),
    );

    sankeySeries.mapPolygons.template.setAll({
      fill: am5.color(0xea580c),
      fillOpacity: 0.78,
      strokeOpacity: 0,
      tooltipText: '{sourceNode.name} → India\nDigital business launch',
    });

    sankeySeries.nodes.mapPolygons.template.setAll({
      fill: am5.color(0xc2410c),
      stroke: am5.color(0xffedd5),
      strokeWidth: 1.6,
      fillOpacity: 0.96,
      strokeOpacity: 1,
      tooltipText: '{name}',
    });

    // Soft glow trail
    sankeySeries.bullets.push(() =>
      am5.Bullet.new(root, {
        locationX: 0,
        sprite: am5.Circle.new(root, {
          radius: 5,
          fill: am5.color(0xf97316),
          fillOpacity: 0.22,
          visible: false,
        }),
      }),
    );

    // Bright payment packet
    sankeySeries.bullets.push(() =>
      am5.Bullet.new(root, {
        locationX: 0,
        autoRotate: true,
        sprite: am5.Circle.new(root, {
          radius: 3.1,
          fill: am5.color(0xfbbf24),
          stroke: am5.color(0xffffff),
          strokeWidth: 1,
          shadowColor: am5.color(0xea580c),
          shadowBlur: 10,
          shadowOpacity: 0.65,
          visible: false,
        }),
      }),
    );

    sankeySeries.data.setAll(indiaLaunchRoutes);

    sankeySeries.events.on('datavalidated', () => {
      am5.array.each(sankeySeries.nodes.dataItems, (di) => {
        const id = di.get('id');
        if (id && countryNames[id]) di.set('name', countryNames[id]);
        const poly = di.get('mapPolygon');
        if (!poly || !id) return;
        if (id === INDIA_ID) {
          poly.setAll({
            fill: am5.color(0xea580c),
            stroke: am5.color(0xffffff),
            strokeWidth: 2.4,
          });
        }
      });

      if (storyRef.current) return;

      const indiaPolygon = polygonSeries.getDataItemById(INDIA_ID)?.get('mapPolygon');
      const centroid = indiaPolygon?.visualCentroid?.();
      const hub =
        centroid && Number.isFinite(centroid.longitude) && Number.isFinite(centroid.latitude)
          ? { longitude: centroid.longitude, latitude: centroid.latitude }
          : INDIA_HUB;

      storyRef.current = createMapStory({
        root,
        chart,
        polygonSeries,
        labelSeries,
        sankeySeries,
        hub,
        originIds: ORIGIN_IDS,
        isMobile,
        reducedMotion,
      });
      // Let the chart settle its first layout before measuring for the camera.
      root.events.once('frameended', () => {
        storyRef.current?.setStage(stageRef.current);
        markReady('map');
      });
    });

    chart.goHome(0);
    chart.appear(700, 40);

    return () => {
      storyRef.current?.dispose();
      storyRef.current = null;
      root.dispose();
    };
    // The map is built once; motion preference is read at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    storyRef.current?.setStage(stageIndex);
  }, [stageIndex]);

  useEffect(() => {
    if (!complete) return undefined;
    setFinished(true);
    storyRef.current?.finish(CONVERGE_MS);
    const reveal = window.setTimeout(() => onRevealRef.current?.(), CONVERGE_MS);
    const exit = window.setTimeout(() => setVisible(false), CONVERGE_MS + HOLD_MS);
    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(exit);
    };
  }, [complete]);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] bg-[#F5F7FB] flex flex-col overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.85, ease }}
          aria-label="Loading nSERVE services"
          aria-busy={!finished}
        >
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 72% 48%, rgba(234,88,12,0.2), transparent 42%), radial-gradient(ellipse at 18% 62%, rgba(14,165,233,0.12), transparent 40%), radial-gradient(ellipse at 48% 8%, rgba(245,158,11,0.1), transparent 38%)',
            }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 z-[1] grid-bg opacity-25" aria-hidden="true" />

          {/* Spotlight behind India — the camera keeps India near the centre */}
          <motion.div
            className="pointer-events-none absolute left-1/2 top-[46%] z-[2] h-[40vmax] w-[40vmax] rounded-full blur-3xl"
            style={{
              x: '-50%',
              y: '-50%',
              background:
                'radial-gradient(circle, rgba(234,88,12,0.16) 0%, rgba(245,158,11,0.06) 42%, transparent 70%)',
            }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2.4, ease }}
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute inset-0 z-[2]"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 22%, rgba(245,247,251,0.4) 62%, rgba(245,247,251,0.96) 100%)',
            }}
            aria-hidden="true"
          />

          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.9, ease }}
          >
            <div ref={hostRef} className="w-full h-[95vh] max-w-full mx-auto" />
          </motion.div>

          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
            <motion.div
              className="flex flex-col items-center gap-1.5 pt-7 sm:pt-10"
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0, scale: finished && !reducedMotion ? 1.08 : 1 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -28 }}
              transition={{ duration: 0.65, delay: finished ? 0 : 0.08, ease }}
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
              <motion.p
                className="font-script text-3xl sm:text-4xl text-orange-600 leading-none"
                animate={
                  finished || reducedMotion ? { opacity: 1 } : { opacity: [0.7, 1, 0.7] }
                }
                transition={
                  finished || reducedMotion
                    ? { duration: 0.4 }
                    : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
                }
              >
                Digital Meets Direct
              </motion.p>
            </motion.div>

            <div className="flex-1" />

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -24 }}
              transition={{ duration: 0.7, delay: 0.18, ease }}
            >
              <PreloaderHud
                progress={progress}
                stageIndex={stageIndex}
                finished={finished}
                reducedMotion={reducedMotion}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
