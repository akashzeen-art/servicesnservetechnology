import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowUpRight, ChevronLeft, ChevronRight, MousePointerClick } from 'lucide-react';
import { timedCardsData as data } from '../data/services';
import SpaceBackground from './SpaceBackground';

const EASE = 'sine.inOut';
const CARD_W = 200;
const CARD_H = 300;
const GAP = 40;
const NUMBER_SIZE = 50;

function typeText(el, text, speed = 38) {
  if (!el) return () => {};
  let i = 0;
  let cancelled = false;
  el.textContent = '';
  el.classList.add('is-typing');

  const tick = () => {
    if (cancelled) return;
    i += 1;
    el.textContent = text.slice(0, i);
    if (i < text.length) {
      window.setTimeout(tick, speed);
    } else {
      el.classList.remove('is-typing');
      el.classList.add('is-done');
    }
  };

  window.setTimeout(tick, 180);
  return () => {
    cancelled = true;
  };
}

export default function TimedCards() {
  const rootRef = useRef(null);
  const apiRef = useRef({ next: () => {}, openActive: () => {} });
  const orderRef = useRef(data.map((_, i) => i));
  const cancelTypeRef = useRef(() => {});

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    let killed = false;
    let order = data.map((_, i) => i);
    orderRef.current = order;
    let detailsEven = true;
    let clicks = 0;
    let offsetTop = 200;
    let offsetLeft = 700;
    let resizeTimer;

    const q = (sel) => root.querySelector(sel);
    const qa = (sel) => root.querySelectorAll(sel);
    const getCard = (i) => q(`#tc-card-${i}`);
    const getCardContent = (i) => q(`#tc-card-content-${i}`);
    const getSliderItem = (i) => q(`#tc-slide-item-${i}`);

    const size = () => ({
      width: root.clientWidth || window.innerWidth,
      height: root.clientHeight || window.innerHeight,
    });

    const animate = (target, duration, properties) =>
      new Promise((resolve) => {
        if (!target || killed) {
          resolve();
          return;
        }
        gsap.to(target, { ...properties, duration, onComplete: resolve });
      });

    const fillDetails = (panelSel, slide, { animateType = false } = {}) => {
      const panel = q(panelSel);
      if (!panel || !slide) return;
      panel.querySelector('.tc-place-text').textContent = slide.place;
      panel.querySelector('.tc-title-1').textContent = slide.title;
      panel.querySelector('.tc-title-2').textContent = slide.title2;
      panel.querySelector('.tc-desc').textContent = slide.description;

      const tagsEl = panel.querySelector('.tc-tags');
      if (tagsEl) {
        tagsEl.innerHTML = slide.tags
          .map((tag) => `<span class="tc-tag">${tag}</span>`)
          .join('');
      }

      const discover = panel.querySelector('.tc-discover');
      discover.textContent = slide.cta;
      discover.setAttribute('href', slide.href);
      const bookmark = panel.querySelector('.tc-bookmark');
      if (bookmark) bookmark.setAttribute('href', slide.href);

      const visit = panel.querySelector('.tc-visit-type');
      const visitLink = panel.querySelector('.tc-visit');
      if (visitLink) visitLink.setAttribute('href', slide.href);

      panel.style.setProperty('--slide-accent', slide.accent);

      cancelTypeRef.current?.();
      if (visit) {
        visit.classList.remove('is-done');
        if (animateType) {
          cancelTypeRef.current = typeText(visit, slide.visitText);
        } else {
          visit.textContent = slide.visitText;
          visit.classList.add('is-done');
        }
      }
    };

    const init = () => {
      const [active, ...rest] = order;
      const { width, height } = size();
      offsetTop = Math.max(height - 430, 100);
      offsetLeft = Math.max(width - 830, 24);

      const detailsActive = detailsEven ? '#tc-details-even' : '#tc-details-odd';
      const detailsInactive = detailsEven ? '#tc-details-odd' : '#tc-details-even';

      fillDetails(detailsActive, data[active], { animateType: true });
      fillDetails(detailsInactive, data[rest[0]] || data[0]);

      gsap.set(q('#tc-pagination'), {
        top: offsetTop + 330,
        left: offsetLeft,
        y: 180,
        opacity: 0,
        zIndex: 60,
      });

      gsap.set(q('nav'), { y: -200, opacity: 0 });

      gsap.set(getCard(active), {
        x: 0,
        y: 0,
        width,
        height,
        borderRadius: 0,
        scale: 1,
      });
      gsap.set(getCardContent(active), { x: 0, y: 0, opacity: 0 });
      gsap.set(q(detailsActive), { opacity: 0, zIndex: 22, x: -160 });
      gsap.set(q(detailsInactive), { opacity: 0, zIndex: 12 });
      gsap.set(`${detailsInactive} .tc-place-text`, { y: 100 });
      gsap.set(`${detailsInactive} .tc-title-1`, { y: 100 });
      gsap.set(`${detailsInactive} .tc-title-2`, { y: 100 });
      gsap.set(`${detailsInactive} .tc-desc`, { y: 50 });
      gsap.set(`${detailsInactive} .tc-tags`, { y: 40, opacity: 0 });
      gsap.set(`${detailsInactive} .tc-cta`, { y: 60 });
      gsap.set(`${detailsInactive} .tc-visit`, { y: 40, opacity: 0 });

      const progressMax = Math.min(420, Math.max(180, width * 0.32));
      gsap.set(q('.tc-progress-bg'), { width: progressMax });
      gsap.set(q('.tc-progress-fg'), {
        width: progressMax * (1 / order.length) * (active + 1),
      });

      rest.forEach((i, index) => {
        gsap.set(getCard(i), {
          x: offsetLeft + 400 + index * (CARD_W + GAP),
          y: offsetTop,
          width: CARD_W,
          height: CARD_H,
          zIndex: 30,
          borderRadius: 14,
          scale: 1,
        });
        gsap.set(getCardContent(i), {
          x: offsetLeft + 400 + index * (CARD_W + GAP),
          zIndex: 40,
          y: offsetTop + CARD_H - 100,
          opacity: 1,
        });
        gsap.set(getSliderItem(i), { x: (index + 1) * NUMBER_SIZE });
      });
      gsap.set(getSliderItem(active), { x: 0 });

      gsap.set(q('.tc-indicator'), { x: -width });

      const startDelay = 0.55;

      gsap.to(q('.tc-cover'), {
        x: width + 400,
        delay: 0.3,
        ease: EASE,
        onComplete: () => {
          if (!killed) window.setTimeout(() => loop(), 450);
        },
      });

      rest.forEach((i, index) => {
        gsap.to(getCard(i), {
          x: offsetLeft + index * (CARD_W + GAP),
          zIndex: 30,
          delay: startDelay + 0.05 * index,
          ease: EASE,
        });
        gsap.to(getCardContent(i), {
          x: offsetLeft + index * (CARD_W + GAP),
          zIndex: 40,
          delay: startDelay + 0.05 * index,
          ease: EASE,
        });
      });

      gsap.to(q('#tc-pagination'), { y: 0, opacity: 1, ease: EASE, delay: startDelay });
      gsap.to(q('nav'), { y: 0, opacity: 1, ease: EASE, delay: startDelay });
      gsap.to(q(detailsActive), { opacity: 1, x: 0, ease: EASE, delay: startDelay });
    };

    const step = () =>
      new Promise((resolve) => {
        if (killed) {
          resolve();
          return;
        }

        order = [...order.slice(1), order[0]];
        orderRef.current = order;
        detailsEven = !detailsEven;

        const detailsActive = detailsEven ? '#tc-details-even' : '#tc-details-odd';
        const detailsInactive = detailsEven ? '#tc-details-odd' : '#tc-details-even';

        fillDetails(detailsActive, data[order[0]], { animateType: true });

        gsap.set(q(detailsActive), { zIndex: 22 });
        gsap.to(q(detailsActive), { opacity: 1, delay: 0.4, ease: EASE });
        gsap.to(`${detailsActive} .tc-place-text`, {
          y: 0,
          delay: 0.1,
          duration: 0.7,
          ease: EASE,
        });
        gsap.to(`${detailsActive} .tc-title-1`, {
          y: 0,
          delay: 0.15,
          duration: 0.7,
          ease: EASE,
        });
        gsap.to(`${detailsActive} .tc-title-2`, {
          y: 0,
          delay: 0.15,
          duration: 0.7,
          ease: EASE,
        });
        gsap.to(`${detailsActive} .tc-desc`, {
          y: 0,
          delay: 0.3,
          duration: 0.4,
          ease: EASE,
        });
        gsap.to(`${detailsActive} .tc-tags`, {
          y: 0,
          opacity: 1,
          delay: 0.32,
          duration: 0.4,
          ease: EASE,
        });
        gsap.to(`${detailsActive} .tc-visit`, {
          y: 0,
          opacity: 1,
          delay: 0.34,
          duration: 0.4,
          ease: EASE,
        });
        gsap.to(`${detailsActive} .tc-cta`, {
          y: 0,
          delay: 0.35,
          duration: 0.4,
          ease: EASE,
          onComplete: resolve,
        });
        gsap.set(q(detailsInactive), { zIndex: 12 });

        const [active, ...rest] = order;
        const prv = rest[rest.length - 1];
        const { width, height } = size();
        const progressMax = Math.min(420, Math.max(180, width * 0.32));

        gsap.set(getCard(prv), { zIndex: 10 });
        gsap.set(getCard(active), { zIndex: 20 });
        gsap.to(getCard(prv), { scale: 1.5, ease: EASE });

        gsap.to(getCardContent(active), {
          y: offsetTop + CARD_H - 10,
          opacity: 0,
          duration: 0.3,
          ease: EASE,
        });
        gsap.to(getSliderItem(active), { x: 0, ease: EASE });
        gsap.to(getSliderItem(prv), { x: -NUMBER_SIZE, ease: EASE });
        gsap.to(q('.tc-progress-fg'), {
          width: progressMax * (1 / order.length) * (active + 1),
          ease: EASE,
        });

        gsap.to(getCard(active), {
          x: 0,
          y: 0,
          ease: EASE,
          width,
          height,
          borderRadius: 0,
          onComplete: () => {
            const xNew = offsetLeft + (rest.length - 1) * (CARD_W + GAP);
            gsap.set(getCard(prv), {
              x: xNew,
              y: offsetTop,
              width: CARD_W,
              height: CARD_H,
              zIndex: 30,
              borderRadius: 14,
              scale: 1,
            });
            gsap.set(getCardContent(prv), {
              x: xNew,
              y: offsetTop + CARD_H - 100,
              opacity: 1,
              zIndex: 40,
            });
            gsap.set(getSliderItem(prv), { x: rest.length * NUMBER_SIZE });

            gsap.set(q(detailsInactive), { opacity: 0 });
            gsap.set(`${detailsInactive} .tc-place-text`, { y: 100 });
            gsap.set(`${detailsInactive} .tc-title-1`, { y: 100 });
            gsap.set(`${detailsInactive} .tc-title-2`, { y: 100 });
            gsap.set(`${detailsInactive} .tc-desc`, { y: 50 });
            gsap.set(`${detailsInactive} .tc-tags`, { y: 40, opacity: 0 });
            gsap.set(`${detailsInactive} .tc-cta`, { y: 60 });
            gsap.set(`${detailsInactive} .tc-visit`, { y: 40, opacity: 0 });

            clicks -= 1;
            if (clicks > 0) step();
          },
        });

        rest.forEach((i, index) => {
          if (i !== prv) {
            const xNew = offsetLeft + index * (CARD_W + GAP);
            gsap.set(getCard(i), { zIndex: 30 });
            gsap.to(getCard(i), {
              x: xNew,
              y: offsetTop,
              width: CARD_W,
              height: CARD_H,
              ease: EASE,
              delay: 0.1 * (index + 1),
            });
            gsap.to(getCardContent(i), {
              x: xNew,
              y: offsetTop + CARD_H - 100,
              opacity: 1,
              zIndex: 40,
              ease: EASE,
              delay: 0.1 * (index + 1),
            });
            gsap.to(getSliderItem(i), {
              x: (index + 1) * NUMBER_SIZE,
              ease: EASE,
            });
          }
        });
      });

    const loop = async () => {
      while (!killed) {
        const { width } = size();
        await animate(q('.tc-indicator'), 2.4, { x: 0 });
        if (killed) break;
        await animate(q('.tc-indicator'), 0.8, { x: width, delay: 0.25 });
        if (killed) break;
        gsap.set(q('.tc-indicator'), { x: -width });
        await step();
      }
    };

    const requestStep = () => {
      clicks += 1;
      if (clicks === 1) step();
    };

    const openActive = () => {
      const active = orderRef.current[0];
      const slide = data[active];
      if (slide?.href) window.open(slide.href, '_blank', 'noopener,noreferrer');
    };

    apiRef.current.next = requestStep;
    apiRef.current.openActive = openActive;

    const onCardClick = (e) => {
      const card = e.target.closest('.tc-card');
      if (!card) return;
      const index = Number(card.dataset.index);
      if (Number.isNaN(index)) return;

      if (index === orderRef.current[0]) {
        openActive();
        return;
      }
      requestStep();
    };

    root.addEventListener('click', onCardClick);

    const loadImages = () =>
      Promise.all(
        data.map(
          ({ image }) =>
            new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = image;
            }),
        ),
      );

    loadImages()
      .then(() => {
        if (!killed) init();
      })
      .catch((err) => {
        console.error(err);
        if (!killed) init();
      });

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (killed) return;
        const { width, height } = size();
        offsetTop = Math.max(height - 430, 100);
        offsetLeft = Math.max(width - 830, 24);
        const [active, ...rest] = order;
        gsap.set(getCard(active), { width, height, x: 0, y: 0 });
        rest.forEach((i, index) => {
          gsap.set(getCard(i), {
            x: offsetLeft + index * (CARD_W + GAP),
            y: offsetTop,
            width: CARD_W,
            height: CARD_H,
          });
          gsap.set(getCardContent(i), {
            x: offsetLeft + index * (CARD_W + GAP),
            y: offsetTop + CARD_H - 100,
          });
        });
        gsap.set(q('#tc-pagination'), {
          top: offsetTop + 330,
          left: offsetLeft,
        });
      }, 120);
    };

    window.addEventListener('resize', onResize);

    return () => {
      killed = true;
      cancelTypeRef.current?.();
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      root.removeEventListener('click', onCardClick);
      gsap.killTweensOf(qa('*'));
    };
  }, []);

  const first = data[0];

  return (
    <section ref={rootRef} className="timed-cards" aria-label="nSERVE services">
      <SpaceBackground />
      <div className="tc-indicator" aria-hidden="true" />

      <nav>
        <div className="nav-brand">
          <img src="/nservelogo.png" alt="" className="nav-logo" />
          <div>nSERVE</div>
        </div>
        <div className="nav-links">
          <div className="active">Services</div>
          <a href="https://gateway.nserve.co/" target="_blank" rel="noopener noreferrer">
            Gateway
          </a>
          <a href="http://payments.nserve.co/" target="_blank" rel="noopener noreferrer">
            Cross Border
          </a>
        </div>
      </nav>

      <div className="tc-stage">
        {data.map((item, index) => (
          <div
            key={`card-${item.title}-${item.title2}`}
            className="tc-card"
            id={`tc-card-${index}`}
            data-index={index}
            style={{
              backgroundImage: `url(${item.image})`,
              ['--slide-accent']: item.accent,
            }}
            role="button"
            tabIndex={0}
            aria-label={`Open ${item.place}`}
          />
        ))}
        {data.map((item, index) => (
          <div
            key={`content-${item.title}-${item.title2}`}
            className="tc-card-content"
            id={`tc-card-content-${index}`}
          >
            <div className="tc-content-start" />
            <div className="tc-content-place">{item.place}</div>
            <div className="tc-content-title-1">{item.title}</div>
            <div className="tc-content-title-2">{item.title2}</div>
          </div>
        ))}
      </div>

      {['even', 'odd'].map((key) => (
        <div
          className="tc-details"
          id={`tc-details-${key}`}
          key={key}
          style={{ ['--slide-accent']: first.accent }}
        >
          <div className="tc-place-box">
            <div className="tc-place-text">{first.place}</div>
          </div>
          <div className="tc-title-box">
            <div className="tc-title-1">{first.title}</div>
          </div>
          <div className="tc-title-box">
            <div className="tc-title-2">{first.title2}</div>
          </div>
          <p className="tc-desc">{first.description}</p>
          <div className="tc-tags">
            {first.tags.map((tag) => (
              <span className="tc-tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>

          <a
            href={first.href}
            className="tc-visit"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MousePointerClick size={16} />
            <span className="tc-visit-type" aria-live="polite">
              {first.visitText}
            </span>
            <span className="tc-visit-cursor" aria-hidden="true" />
          </a>

          <div className="tc-cta">
            <a
              href={first.href}
              className="tc-bookmark"
              aria-label="Open service"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ArrowUpRight size={18} />
            </a>
            <a
              href={first.href}
              className="tc-discover"
              target="_blank"
              rel="noopener noreferrer"
            >
              {first.cta}
            </a>
          </div>
        </div>
      ))}

      <div className="tc-pagination" id="tc-pagination">
        <button
          type="button"
          className="tc-arrow"
          aria-label="Previous"
          onClick={() => apiRef.current.next()}
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          className="tc-arrow"
          aria-label="Next"
          onClick={() => apiRef.current.next()}
        >
          <ChevronRight />
        </button>
        <div className="tc-progress-wrap">
          <div className="tc-progress-bg">
            <div className="tc-progress-fg" />
          </div>
        </div>
        <div className="tc-slide-numbers">
          {data.map((_, index) => (
            <div className="tc-slide-item" id={`tc-slide-item-${index}`} key={index}>
              {index + 1}
            </div>
          ))}
        </div>
      </div>

      <div className="tc-cover" aria-hidden="true" />
    </section>
  );
}
