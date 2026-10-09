import { AnimatePresence, motion } from 'framer-motion';
import { PRELOADER_STAGES } from '../../data/preloaderStages';

const ease = [0.4, 0, 0.2, 1];

export default function PreloaderHud({ progress, stageIndex, finished, reducedMotion }) {
  const stage = PRELOADER_STAGES[stageIndex];
  const shift = reducedMotion ? 0 : 8;

  return (
    <div className="flex w-full justify-center px-6 pb-8 sm:pb-12">
      <div className="w-full max-w-[20rem] sm:max-w-[24rem]">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="relative h-5 flex-1 overflow-hidden" aria-live="polite">
            <AnimatePresence initial={false}>
              <motion.p
                key={finished ? 'ready' : stage.id}
                className="absolute inset-0 truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 sm:text-xs"
                initial={{ opacity: 0, y: shift }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -shift }}
                transition={{ duration: 0.4, ease }}
              >
                {finished ? (
                  'Ready'
                ) : (
                  <>
                    <span className="mr-2 text-orange-600">{stage.number}</span>
                    {stage.title}
                  </>
                )}
              </motion.p>
            </AnimatePresence>
          </div>
          <span className="text-[11px] font-semibold tabular-nums text-slate-400 sm:text-xs">{progress}%</span>
        </div>

        <div className="relative h-[3px] overflow-hidden rounded-full bg-slate-200/80" aria-hidden="true">
          <div
            className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-orange-600 to-amber-400 transition-transform duration-150 ease-linear"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
      </div>
    </div>
  );
}
