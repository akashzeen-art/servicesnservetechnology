import { AnimatePresence, motion } from 'framer-motion';
import { FINAL_STATUS, PRELOADER_STAGES } from '../../data/preloaderStages';

const ease = [0.4, 0, 0.2, 1];

export default function PreloaderHud({ progress, stageIndex, finished, reducedMotion }) {
  const stage = PRELOADER_STAGES[stageIndex];
  const status = finished ? FINAL_STATUS : stage.status;
  const shift = reducedMotion ? 0 : 12;
  const swap = {
    initial: { opacity: 0, y: shift },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -shift },
    transition: { duration: 0.45, ease },
  };

  return (
    <div className="flex w-full flex-col items-center gap-3 px-5 pb-7 sm:gap-4 sm:pb-11">
      <div className="relative h-[3.4rem] w-full max-w-xl text-center sm:h-[4.1rem]" aria-live="polite">
        <AnimatePresence initial={false}>
          <motion.div key={stage.id} className="absolute inset-0 flex flex-col items-center gap-0.5" {...swap}>
            <span className="text-[11px] font-bold tracking-[0.32em] text-orange-600">{stage.number}</span>
            <span className="font-display text-xl font-bold uppercase tracking-[0.06em] text-slate-900 sm:text-[1.7rem]">
              {stage.title}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative h-5 w-full max-w-md overflow-hidden text-center">
        <AnimatePresence initial={false}>
          <motion.p
            key={status}
            className={`absolute inset-0 text-sm tracking-wide ${finished ? 'font-semibold text-orange-600' : 'text-slate-500'}`}
            {...swap}
          >
            {status}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-[21rem] sm:max-w-[26rem]">
        <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
          {PRELOADER_STAGES.map((item, index) => {
            const fill = Math.min(1, Math.max(0, (progress - index * 25) / 25));
            const active = index === stageIndex && !finished;
            return (
              <div key={item.id} className="relative h-1.5 overflow-hidden rounded-full bg-slate-200/90">
                <div
                  className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 transition-transform duration-150 ease-linear"
                  style={{ transform: `scaleX(${fill})` }}
                />
                {active && !reducedMotion && (
                  <motion.div
                    className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                    animate={{ left: ['-30%', '120%'] }}
                    transition={{ duration: 1.25, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-2 grid grid-cols-4 gap-1.5 text-center text-[9px] uppercase tracking-[0.1em] sm:text-[10px]">
          {PRELOADER_STAGES.map((item, index) => {
            const tone =
              index === stageIndex && !finished
                ? 'font-semibold text-orange-600'
                : index < stageIndex || finished
                  ? 'text-slate-500'
                  : 'text-slate-300';
            return (
              <span key={item.id} className={`transition-colors duration-500 ${tone}`}>
                {item.short}
              </span>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-slate-400">
          <span>Loading services</span>
          <span className="tabular-nums font-semibold text-orange-600">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
