import * as am5 from '@amcharts/amcharts5';
import * as am5map from '@amcharts/amcharts5/map';
import { DCB_NODES, GATEWAY_NODES, SOLUTION_NODES } from '../../data/preloaderStages';
import { PRIMARY_CORRIDORS } from '../../data/indiaLaunchRoutes';

const COLOR = {
  navy: am5.color(0x0f172a),
  slate: am5.color(0x64748b),
  orange: am5.color(0xea580c),
  amber: am5.color(0xf59e0b),
  tint: am5.color(0xfbd5a5),
  tintSoft: am5.color(0xfde6c8),
  gold: am5.color(0xfbbf24),
  blue: am5.color(0x1e40af),
  white: am5.color(0xffffff),
  border: am5.color(0xe2e8f0),
};

/** Close to cubic-bezier(0.4, 0, 0.2, 1). */
const EASE = am5.ease.inOut(am5.ease.cubic);
const LINEAR = am5.ease.linear;

const ICON_PATHS = {
  phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M12 18h.01',
  tower:
    'M4.9 16.1C1 12.2 1 5.8 4.9 1.9 M7.8 4.7a6.14 6.14 0 0 0-.8 7.5 M16.2 4.8c2 2 2.26 5.11.8 7.47 M19.1 1.9a9.96 9.96 0 0 1 0 14.1 M10 9a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M9.5 18h5 M8 22l4-11 4 11',
};

const MOBILE_LABELS = new Set(['IN', 'GB', 'SG', 'AU']);

/**
 * Drives the preloader's four-stage story on top of the existing amCharts map:
 * camera framing, the India hub and one layer per business vertical.
 * Stages only move forward; `setStage` catches up if several are skipped.
 */
export function createMapStory({
  root,
  chart,
  polygonSeries,
  labelSeries,
  sankeySeries,
  hub,
  originIds,
  isMobile,
  reducedMotion,
}) {
  const motion = !reducedMotion;
  const timers = new Set();
  let disposed = false;
  let stage = -1;
  let basePxPerDeg = null;

  const later = (fn, ms) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (!disposed) fn();
    }, ms);
    timers.add(id);
  };

  const at = (dLon, dLat) => ({ longitude: hub.longitude + dLon, latitude: hub.latitude + dLat });
  const fade = (target, to, duration = 600) =>
    target && !target.isDisposed() && target.animate({ key: 'opacity', to, duration, easing: EASE });

  const pushSeries = (series) => {
    series.set('opacity', 0);
    return chart.series.push(series);
  };

  /* ---------------------------------------------------------------- camera */

  const measure = () => {
    const a = chart.convert({ longitude: hub.longitude - 10, latitude: hub.latitude });
    const b = chart.convert({ longitude: hub.longitude + 10, latitude: hub.latitude });
    const pxPerDeg = Math.abs(b.x - a.x) / 20;
    if (pxPerDeg > 0) basePxPerDeg = pxPerDeg / chart.get('zoomLevel', 1);
  };

  const viewport = () => {
    const width = root.dom.clientWidth || window.innerWidth;
    const height = window.innerHeight;
    return { width, availH: Math.max(240, height - (isMobile ? 340 : 320)) };
  };

  /** Pixels per degree that frame India plus the solution nodes around it. */
  const indiaScale = (multiplier) => {
    const { width, availH } = viewport();
    const labelHalf = isMobile ? 60 : 90;
    const px = Math.min((width / 2 - labelHalf) / 21, (availH / 2 - 30) / 13);
    return Math.max(px, 2) * multiplier;
  };

  /** Pixels per degree that frame India with its international corridors. */
  const worldScale = () => {
    const { width, availH } = viewport();
    const fit = Math.min((width * 0.86) / 255, (availH * 0.95) / 92);
    return isMobile ? Math.max(fit, (width * 0.9) / 150) : fit;
  };

  // The sankey ribbons are geo shapes and grow with zoom, so the close-up stays moderate.
  const maxStoryZoom = isMobile ? 6.5 : 5.5;

  const fly = (geoPoint, pxPerDeg, duration) => {
    if (!basePxPerDeg) measure();
    if (!basePxPerDeg) return;
    const zoom = Math.min(maxStoryZoom, Math.max(1, pxPerDeg / basePxPerDeg));
    if (motion) {
      chart.zoomToGeoPoint(geoPoint, zoom, true, duration);
      return;
    }
    // Reduced motion: a quick cross-fade instead of a camera flight.
    const out = chart.animate({ key: 'opacity', to: 0, duration: 180, easing: EASE });
    out.events.once('stopped', () => {
      if (disposed) return;
      chart.zoomToGeoPoint(geoPoint, zoom, true, 0);
      chart.animate({ key: 'opacity', to: 1, duration: 280, easing: EASE });
    });
  };

  const indiaLabel = () =>
    labelSeries.dataItems.find((item) => item.dataContext?.id === 'IN')?.bullets?.[0]?.get('sprite');

  const worldCenter = isMobile ? { longitude: 62, latitude: 18 } : { longitude: 22, latitude: 20 };

  /* -------------------------------------------------------------- helpers */

  /** Reveals a line by animating its dash offset, then leaves it solid (or flowing). */
  const drawLine = (dataItem, duration, after) => {
    const line = dataItem.get('mapLine');
    if (!line) return;
    if (!motion) {
      line.set('strokeDasharray', after?.dash ?? []);
      return;
    }
    const [lon0, lat0] = dataItem.get('geometry').coordinates[0];
    const [lon1, lat1] = dataItem.get('geometry').coordinates.at(-1);
    const a = chart.convert({ longitude: lon0, latitude: lat0 });
    const b = chart.convert({ longitude: lon1, latitude: lat1 });
    const length = Math.hypot(b.x - a.x, b.y - a.y) * 1.25 + 12;
    line.setAll({ strokeDasharray: [length, length], strokeDashoffset: length });
    const draw = line.animate({ key: 'strokeDashoffset', to: 0, duration, easing: EASE });
    draw.events.once('stopped', () => {
      if (disposed || line.isDisposed()) return;
      line.setAll({ strokeDasharray: after?.dash ?? [], strokeDashoffset: 0 });
      if (after?.flow) {
        line.animate({ key: 'strokeDashoffset', from: 0, to: -16, duration: 900, loops: Infinity, easing: LINEAR });
      }
    });
  };

  /** A gentle arc (quadratic curve in lon/lat) so short in-country routes echo the corridor ribbons. */
  const arcCoordinates = (from, to, bend) => {
    if (!bend) return [[from.longitude, from.latitude], [to.longitude, to.latitude]];
    const dx = to.longitude - from.longitude;
    const dy = to.latitude - from.latitude;
    const cx = (from.longitude + to.longitude) / 2 - dy * bend;
    const cy = (from.latitude + to.latitude) / 2 + dx * bend;
    return Array.from({ length: 25 }, (_, i) => {
      const t = i / 24;
      const u = 1 - t;
      return [
        u * u * from.longitude + 2 * u * t * cx + t * t * to.longitude,
        u * u * from.latitude + 2 * u * t * cy + t * t * to.latitude,
      ];
    });
  };

  const addLine = (series, from, to, bend = 0) =>
    series.pushDataItem({
      geometry: { type: 'LineString', coordinates: arcCoordinates(from, to, bend) },
    });

  const particleSeries = (radius = 2.6) => {
    const series = pushSeries(am5map.MapPointSeries.new(root, {}));
    series.bullets.push(() =>
      am5.Bullet.new(root, {
        sprite: am5.Circle.new(root, {
          radius,
          fill: COLOR.gold,
          stroke: COLOR.white,
          strokeWidth: 1,
          shadowColor: COLOR.orange,
          shadowBlur: motion ? 6 : 0,
          shadowOpacity: 0.5,
        }),
      }),
    );
    return series;
  };

  const smallLabel = (text, settings = {}) =>
    am5.Label.new(root, {
      text,
      centerX: am5.p50,
      centerY: 0,
      fontSize: isMobile ? 10 : 12,
      fontWeight: '600',
      fill: COLOR.navy,
      opacity: 0.85,
      paddingTop: 0,
      paddingBottom: 0,
      ...settings,
    });

  const pillLabel = (text, settings = {}) =>
    am5.Label.new(root, {
      text,
      centerX: am5.p50,
      centerY: am5.p50,
      fontSize: isMobile ? 10 : 12,
      fontWeight: '700',
      fill: COLOR.navy,
      paddingTop: isMobile ? 3 : 5,
      paddingBottom: isMobile ? 3 : 5,
      paddingLeft: isMobile ? 8 : 11,
      paddingRight: isMobile ? 8 : 11,
      background: am5.RoundedRectangle.new(root, {
        fill: COLOR.white,
        fillOpacity: 0.94,
        stroke: COLOR.border,
        strokeWidth: 1,
        cornerRadiusTL: 999,
        cornerRadiusTR: 999,
        cornerRadiusBL: 999,
        cornerRadiusBR: 999,
        shadowColor: COLOR.navy,
        shadowBlur: 8,
        shadowOpacity: 0.08,
        shadowOffsetY: 2,
      }),
      ...settings,
    });

  /* ------------------------------------------------------------------ hub */

  const hubSprites = { waves: [] };
  const hubSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
  const waveRadius = isMobile ? 46 : 72;

  for (let i = 0; i < 3; i += 1) {
    hubSeries.bullets.push(() => {
      const wave = am5.Circle.new(root, {
        radius: 6,
        fillOpacity: 0,
        stroke: COLOR.orange,
        strokeWidth: 1.2,
        opacity: 0,
      });
      hubSprites.waves.push(wave);
      return am5.Bullet.new(root, { sprite: wave });
    });
  }
  hubSeries.bullets.push(() => {
    hubSprites.halo = am5.Circle.new(root, {
      radius: isMobile ? 14 : 20,
      fill: COLOR.orange,
      fillOpacity: 0.14,
      stroke: COLOR.gold,
      strokeOpacity: 0.5,
      strokeWidth: 1,
      opacity: 0,
    });
    return am5.Bullet.new(root, { sprite: hubSprites.halo });
  });
  hubSeries.bullets.push(() => {
    hubSprites.pulse = am5.Circle.new(root, {
      radius: 8,
      fillOpacity: 0,
      stroke: COLOR.gold,
      strokeWidth: 2,
      opacity: 0,
    });
    return am5.Bullet.new(root, { sprite: hubSprites.pulse });
  });
  hubSeries.bullets.push(() => {
    hubSprites.core = am5.Circle.new(root, {
      radius: isMobile ? 5 : 6,
      fill: COLOR.white,
      stroke: COLOR.orange,
      strokeWidth: 2.5,
      shadowColor: COLOR.orange,
      shadowBlur: 8,
      shadowOpacity: 0.45,
    });
    return am5.Bullet.new(root, { sprite: hubSprites.core });
  });
  hubSeries.data.push({ ...hub });

  let wavesOn = false;
  const startWaves = () => {
    if (!motion || wavesOn) return;
    wavesOn = true;
    hubSprites.waves.forEach((wave, index) => {
      later(() => {
        if (!wavesOn) return;
        wave.animate({ key: 'radius', from: 6, to: waveRadius, duration: 2400, loops: Infinity, easing: am5.ease.out(am5.ease.quad) });
        wave.animate({ key: 'opacity', from: 0.5, to: 0, duration: 2400, loops: Infinity, easing: LINEAR });
      }, index * 800);
    });
  };
  const stopWaves = () => {
    wavesOn = false;
    hubSprites.waves.forEach((wave) => {
      wave.animate({ key: 'opacity', to: 0, duration: 400, easing: EASE });
    });
    later(() => hubSprites.waves.forEach((wave) => wave.animate({ key: 'radius', to: 6, duration: 0 })), 420);
  };

  let lastPulse = 0;
  const pulseHub = (strength = 1) => {
    const pulse = hubSprites.pulse;
    if (!motion || !pulse) return;
    const now = performance.now();
    if (now - lastPulse < 320) return;
    lastPulse = now;
    pulse.setAll({ radius: 7, opacity: 0.75 * strength });
    pulse.animate({ key: 'radius', to: 22 + 14 * strength, duration: 700, easing: am5.ease.out(am5.ease.cubic) });
    pulse.animate({ key: 'opacity', to: 0, duration: 700, easing: EASE });
  };

  const showHalo = (scale) => {
    const halo = hubSprites.halo;
    if (!halo) return;
    fade(halo, 1, 600);
    halo.animate({ key: 'scale', to: scale, duration: 700, easing: EASE });
  };

  /* ----------------------------------------------------- stage 1 — DCB */

  const dcb = (() => {
    const cells = isMobile ? DCB_NODES.cells.slice(0, 3) : DCB_NODES.cells;
    const subscriber = at(DCB_NODES.subscriber.dLon, DCB_NODES.subscriber.dLat);
    const carrier = at(DCB_NODES.carrier.dLon, DCB_NODES.carrier.dLat);

    const cellLines = pushSeries(am5map.MapLineSeries.new(root, { lineType: 'straight' }));
    cellLines.mapLines.template.setAll({ stroke: COLOR.orange, strokeOpacity: 0.32, strokeWidth: 1, strokeDasharray: [2, 4] });
    cells.forEach((cell) => addLine(cellLines, at(cell.dLon, cell.dLat), hub));

    const storyLines = pushSeries(am5map.MapLineSeries.new(root, { lineType: 'straight' }));
    storyLines.mapLines.template.setAll({ stroke: COLOR.orange, strokeOpacity: 0.85, strokeWidth: 2 });
    const leg1 = addLine(storyLines, subscriber, carrier, 0.22);
    const leg2 = addLine(storyLines, carrier, hub, 0.25);

    const nodes = pushSeries(am5map.MapPointSeries.new(root, {}));
    const pings = [];
    let dcbChip = null;
    nodes.bullets.push((_, __, dataItem) => {
      const node = dataItem.dataContext;
      if (node.kind === 'cell') {
        const ping = am5.Circle.new(root, { radius: 3, fillOpacity: 0, stroke: COLOR.orange, strokeWidth: 1, opacity: 0 });
        pings.push(ping);
        return am5.Bullet.new(root, { sprite: ping });
      }
      return undefined;
    });
    nodes.bullets.push((_, __, dataItem) => {
      const node = dataItem.dataContext;
      if (node.kind === 'cell') {
        return am5.Bullet.new(root, {
          sprite: am5.Circle.new(root, { radius: 3.2, fill: COLOR.white, stroke: COLOR.orange, strokeWidth: 1.3 }),
        });
      }
      if (node.kind === 'chip') return undefined;
      const badge = am5.Container.new(root, { centerX: am5.p50, centerY: am5.p50 });
      badge.children.push(
        am5.Circle.new(root, {
          radius: isMobile ? 13 : 17,
          fill: COLOR.white,
          stroke: COLOR.orange,
          strokeWidth: 1.6,
          shadowColor: COLOR.navy,
          shadowBlur: 10,
          shadowOpacity: 0.12,
          shadowOffsetY: 2,
        }),
      );
      badge.children.push(
        am5.Graphics.new(root, {
          svgPath: ICON_PATHS[node.icon],
          stroke: COLOR.navy,
          strokeWidth: 2,
          fillOpacity: 0,
          scale: isMobile ? 0.55 : 0.68,
          centerX: am5.p50,
          centerY: am5.p50,
        }),
      );
      return am5.Bullet.new(root, { sprite: badge });
    });
    nodes.bullets.push((_, __, dataItem) => {
      const node = dataItem.dataContext;
      if (node.kind === 'icon') {
        return am5.Bullet.new(root, { sprite: smallLabel(node.label, { dy: isMobile ? 17 : 22 }) });
      }
      if (node.kind === 'chip') {
        const chip = pillLabel('Paid · mobile balance', { dy: isMobile ? 18 : 22, opacity: motion ? 0 : 1 });
        dcbChip = chip;
        return am5.Bullet.new(root, { sprite: chip });
      }
      return undefined;
    });

    nodes.data.setAll([
      { kind: 'icon', icon: 'phone', label: DCB_NODES.subscriber.label, ...subscriber },
      { kind: 'icon', icon: 'tower', label: DCB_NODES.carrier.label, ...carrier },
      ...cells.map((cell) => ({ kind: 'cell', ...at(cell.dLon, cell.dLat) })),
      { kind: 'chip', ...hub },
    ]);

    const packets = particleSeries(3);
    const packet1 = packets.pushDataItem({ lineDataItem: leg1, positionOnLine: 0 });
    const packet2 = packets.pushDataItem({ lineDataItem: leg2, positionOnLine: 0 });

    let active = false;
    const setPacketOpacity = (dataItem, value) => {
      dataItem.bullets?.forEach((bullet) => bullet.get('sprite')?.set('opacity', value));
    };

    const runPayment = () => {
      if (!active || !motion) return;
      setPacketOpacity(packet2, 0);
      setPacketOpacity(packet1, 1);
      const first = packet1.animate({ key: 'positionOnLine', from: 0, to: 1, duration: 900, easing: EASE });
      first.events.once('stopped', () => {
        if (!active || disposed) return;
        setPacketOpacity(packet1, 0);
        setPacketOpacity(packet2, 1);
        const second = packet2.animate({ key: 'positionOnLine', from: 0, to: 1, duration: 650, easing: EASE });
        second.events.once('stopped', () => {
          if (!active || disposed) return;
          setPacketOpacity(packet2, 0);
          pulseHub(1);
          if (dcbChip) {
            fade(dcbChip, 1, 250);
            later(() => fade(dcbChip, 0, 300), 800);
          }
          later(runPayment, 1300);
        });
      });
    };

    return {
      show() {
        active = true;
        [cellLines, storyLines, nodes].forEach((series) => fade(series, 1, 700));
        fade(packets, 1, 300);
        later(() => {
          drawLine(leg1, 700);
          later(() => drawLine(leg2, 500), 420);
        }, 150);
        if (motion) {
          pings.forEach((ping, index) => {
            later(() => {
              if (!active) return;
              ping.animate({ key: 'radius', from: 3, to: 12, duration: 1800, loops: Infinity, easing: am5.ease.out(am5.ease.quad) });
              ping.animate({ key: 'opacity', from: 0.6, to: 0, duration: 1800, loops: Infinity, easing: LINEAR });
            }, 300 + index * 260);
          });
        }
        later(runPayment, 1000);
      },
      hide() {
        active = false;
        [cellLines, storyLines, nodes, packets].forEach((series) => fade(series, 0, 500));
      },
    };
  })();

  /* ------------------------------------------- stage 2 — India gateway */

  const gateway = (() => {
    const lines = pushSeries(am5map.MapLineSeries.new(root, { lineType: 'straight' }));
    lines.mapLines.template.setAll({ stroke: COLOR.amber, strokeOpacity: 0.85, strokeWidth: 1.8 });
    const routes = GATEWAY_NODES.map((node) => addLine(lines, at(node.dLon, node.dLat), hub, 0.2));

    const nodes = pushSeries(am5map.MapPointSeries.new(root, {}));
    nodes.bullets.push(() =>
      am5.Bullet.new(root, {
        sprite: am5.Circle.new(root, { radius: isMobile ? 8 : 11, fill: COLOR.amber, fillOpacity: 0.16, strokeOpacity: 0 }),
      }),
    );
    nodes.bullets.push(() =>
      am5.Bullet.new(root, {
        sprite: am5.Circle.new(root, { radius: isMobile ? 4 : 5, fill: COLOR.amber, stroke: COLOR.white, strokeWidth: 2 }),
      }),
    );
    nodes.bullets.push((_, __, dataItem) =>
      am5.Bullet.new(root, {
        sprite: pillLabel(dataItem.dataContext.label, { centerY: am5.p100, dy: -14 }),
      }),
    );
    nodes.data.setAll(GATEWAY_NODES.map((node) => ({ label: node.label, ...at(node.dLon, node.dLat) })));

    const particles = particleSeries(2.4);
    const perRoute = isMobile ? 1 : 2;
    const flows = routes.flatMap((route) =>
      Array.from({ length: perRoute }, () => particles.pushDataItem({ lineDataItem: route, positionOnLine: 0 })),
    );

    let active = false;
    const runFlow = (dataItem, delay) => {
      later(() => {
        if (!active || disposed) return;
        const duration = 1300 + Math.random() * 700;
        const move = dataItem.animate({ key: 'positionOnLine', from: 0, to: 1, duration, easing: am5.ease.quad });
        move.events.once('stopped', () => {
          if (!active || disposed) return;
          pulseHub(0.7);
          runFlow(dataItem, 120 + Math.random() * 380);
        });
      }, delay);
    };

    return {
      show() {
        active = true;
        [lines, nodes].forEach((series) => fade(series, 1, 700));
        routes.forEach((route, index) => later(() => drawLine(route, 650), 120 + index * 110));
        if (motion) {
          fade(particles, 1, 400);
          flows.forEach((flow, index) => runFlow(flow, 650 + index * 230));
        }
      },
      hide() {
        active = false;
        [lines, nodes, particles].forEach((series) => fade(series, 0, 550));
      },
    };
  })();

  /* ---------------------------------------- stage 3 — cross-border corridors */

  const corridors = (() => {
    const neutralFill = polygonSeries.mapPolygons.template.get('fill');
    const primary = new Set(PRIMARY_CORRIDORS);

    const linkFor = (sourceId) =>
      sankeySeries.dataItems.find((dataItem) => dataItem.get('sourceId') === sourceId);

    const sourceNodeOf = (link) => link?.get('sourceNode')?.get('mapPolygon');

    const labelFor = (id) => {
      const dataItem = labelSeries.dataItems.find((item) => item.get('polygonId') === id || item.dataContext?.id === id);
      return dataItem?.bullets?.[0]?.get('sprite');
    };

    const countryPolygon = (id) => polygonSeries.getDataItemById(id)?.get('mapPolygon');

    const startBullets = (link, index, isPrimary) => {
      link.bullets?.forEach((bullet, bulletIndex) => {
        if (!motion) return;
        const isPacket = bulletIndex === 1;
        if ((isMobile || !isPrimary) && !isPacket) return;
        const duration = 1800 + Math.random() * 1600;
        later(() => {
          const sprite = bullet.get('sprite');
          if (!sprite || sprite.isDisposed() || bullet.isDisposed()) return;
          sprite.setAll({ visible: true, opacity: isPrimary ? 1 : 0.6 });
          bullet.animate({ key: 'locationX', from: 0, to: 1, duration, easing: LINEAR, loops: Infinity });
        }, index * 70 + bulletIndex * 40);
      });
    };

    const reveal = (id, index, isPrimary) => {
      const link = linkFor(id);
      if (!link) return;
      fade(link.get('mapPolygon'), isPrimary ? 0.85 : 0.28, 650);
      fade(sourceNodeOf(link), isPrimary ? 0.9 : 0.45, 650);
      countryPolygon(id)?.animate({
        key: 'fill',
        to: isPrimary ? COLOR.tint : COLOR.tintSoft,
        duration: 700,
        easing: EASE,
      });
      if (isPrimary) fade(labelFor(id), 1, 500);
      startBullets(link, index, isPrimary);
    };

    return {
      prepare() {
        sankeySeries.dataItems.forEach((link) => {
          link.get('mapPolygon')?.set('opacity', 0);
          sourceNodeOf(link)?.set('opacity', 0);
          link.bullets?.forEach((bullet) => bullet.get('sprite')?.set('visible', false));
        });
        sankeySeries.nodes.dataItems.forEach((node) => node.get('mapPolygon')?.set('opacity', 0));
        originIds.forEach((id) => countryPolygon(id)?.set('fill', neutralFill));
      },
      show() {
        fade(sankeySeries, 1, 300);
        PRIMARY_CORRIDORS.forEach((id, index) => later(() => reveal(id, index, true), 250 + index * 190));
        const secondary = originIds.filter((id) => !primary.has(id));
        secondary.forEach((id, index) => later(() => reveal(id, index, false), 250 + PRIMARY_CORRIDORS.length * 190 + 120 + index * 60));
      },
      dim() {
        sankeySeries.dataItems.forEach((link) => {
          const isPrimary = primary.has(link.get('sourceId'));
          fade(link.get('mapPolygon'), isPrimary ? 0.1 : 0, 700);
          link.bullets?.forEach((bullet) => {
            const sprite = bullet.get('sprite');
            if (sprite?.get('visible')) fade(sprite, isPrimary ? 0.35 : 0, 700);
          });
        });
        sankeySeries.nodes.dataItems.forEach((node) => fade(node.get('mapPolygon'), 0, 600));
        labelSeries.dataItems.forEach((item) => {
          const id = item.get('polygonId') ?? item.dataContext?.id;
          fade(item.bullets?.[0]?.get('sprite'), 0, 500);
        });
      },
      settle() {
        fade(sankeySeries, 0, 600);
      },
    };
  })();

  /* ---------------------------------------- stage 4 — telecom solutions */

  const solutions = (() => {
    const lines = pushSeries(am5map.MapLineSeries.new(root, { lineType: 'straight' }));
    lines.mapLines.template.setAll({ stroke: COLOR.blue, strokeOpacity: 0.5, strokeWidth: 1.4 });
    const links = SOLUTION_NODES.map((node) => addLine(lines, at(node.dLon, node.dLat), hub, 0.12));

    const nodes = pushSeries(am5map.MapPointSeries.new(root, {}));
    nodes.bullets.push(() =>
      am5.Bullet.new(root, {
        sprite: am5.Circle.new(root, {
          radius: isMobile ? 5 : 6.5,
          fill: COLOR.white,
          stroke: COLOR.orange,
          strokeWidth: 2.5,
          shadowColor: COLOR.orange,
          shadowBlur: 8,
          shadowOpacity: 0.35,
        }),
      }),
    );
    nodes.bullets.push((_, __, dataItem) =>
      am5.Bullet.new(root, {
        sprite: pillLabel(dataItem.dataContext.label.toUpperCase(), {
          centerY: am5.p100,
          dy: -13,
          fontSize: isMobile ? 9 : 11,
        }),
      }),
    );
    if (!isMobile) {
      nodes.bullets.push((_, __, dataItem) =>
        am5.Bullet.new(root, {
          sprite: smallLabel(dataItem.dataContext.services, {
            dy: 13,
            fontSize: 11,
            fontWeight: '500',
            fill: COLOR.slate,
            opacity: 0.9,
          }),
        }),
      );
    }
    nodes.data.setAll(SOLUTION_NODES.map((node) => ({ ...node, ...at(node.dLon, node.dLat) })));

    return {
      show() {
        fade(lines, 1, 600);
        fade(nodes, 1, 700);
        links.forEach((link, index) =>
          later(() => drawLine(link, 600, { dash: [4, 4], flow: motion }), 100 + index * 120),
        );
      },
      converge(duration) {
        fade(lines, 0, duration * 0.6);
        nodes.dataItems.forEach((dataItem) => {
          if (motion) {
            dataItem.animate({ key: 'longitude', to: hub.longitude, duration, easing: EASE });
            dataItem.animate({ key: 'latitude', to: hub.latitude, duration, easing: EASE });
          }
        });
        later(() => fade(nodes, 0, duration * 0.4), duration * 0.6);
      },
    };
  })();

  corridors.prepare();

  /* ---------------------------------------------------------- stages */

  const enter = (index) => {
    if (index === 0) {
      fade(indiaLabel(), 0, 400);
      fly(hub, indiaScale(1), 1500);
      showHalo(1);
      startWaves();
      later(() => dcb.show(), 450);
    } else if (index === 1) {
      stopWaves();
      dcb.hide();
      fly(hub, indiaScale(1), 900);
      later(() => gateway.show(), 200);
    } else if (index === 2) {
      later(() => gateway.hide(), 250);
      fly(worldCenter, worldScale(), 1200);
      showHalo(isMobile ? 1.2 : 1.5);
      later(() => fade(indiaLabel(), 1, 500), 700);
      later(() => corridors.show(), 300);
    } else if (index === 3) {
      corridors.dim();
      showHalo(1.15);
      fly(hub, indiaScale(0.94), 1100);
      later(() => solutions.show(), 450);
    }
  };

  const setStage = (next) => {
    if (disposed) return;
    while (stage < next) {
      stage += 1;
      enter(stage);
    }
  };

  return {
    setStage,
    finish(duration) {
      if (disposed) return;
      setStage(3);
      corridors.settle();
      solutions.converge(duration);
      fly(hub, indiaScale(1.12), duration + 200);
      later(() => {
        pulseHub(1.6);
        showHalo(isMobile ? 1.4 : 1.8);
      }, duration * 0.85);
    },
    dispose() {
      disposed = true;
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    },
  };
}
