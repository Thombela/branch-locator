import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  type PanInfo,
} from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { FADE_REDUCED, SPRING_DEFAULT } from '@/lib/motion';
import { detentHeights, nearestDetent, type Detent } from './detents';
import styles from './DetentSheet.module.css';

interface DetentSheetProps {
  detent: Detent;
  onDetentChange: (detent: Detent) => void;
  header: ReactNode;
  children: ReactNode;
  label: string;
  /** Reports how much of the screen the sheet currently covers, for map framing. */
  onCoverageChange?: (pixels: number) => void;
}

function useViewportHeight() {
  const [height, setHeight] = useState(() => window.innerHeight);
  useEffect(() => {
    const update = () => setHeight(window.innerHeight);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return height;
}

/**
 * A draggable sheet with three resting points. It is laid out at full height and moved down
 * by `y`. On release, a spring carries the drag's speed to the nearest resting point. Every
 * animation starts from the current `y`, so the sheet can be caught and dragged mid-flight.
 */
export function DetentSheet({
  detent,
  onDetentChange,
  header,
  children,
  label,
  onCoverageChange,
}: DetentSheetProps) {
  const viewportHeight = useViewportHeight();
  const heights = detentHeights(viewportHeight);
  const fullHeight = heights.full;
  const offsetFor = (d: Detent) => fullHeight - heights[d];

  const reduceMotion = useReducedMotion() ?? false;
  const y = useMotionValue(offsetFor(detent));
  const dragControls = useDragControls();
  const settledByDrag = useRef<Detent | null>(null);
  const dragged = useRef(false);

  // Animate when the detent changes for any reason other than a drag we already animated.
  useLayoutEffect(() => {
    if (settledByDrag.current === detent) {
      settledByDrag.current = null;
      return;
    }
    const controls = animate(y, offsetFor(detent), reduceMotion ? { duration: 0 } : SPRING_DEFAULT);
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- offsets derive from the viewport height
  }, [detent, fullHeight, reduceMotion]);

  useEffect(() => {
    onCoverageChange?.(heights[detent]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report on detent/viewport change only
  }, [detent, viewportHeight]);

  const onDragEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const visible = fullHeight - y.get();
    const next = nearestDetent(visible, -info.velocity.y, heights);
    settledByDrag.current = next === detent ? null : next;
    animate(y, offsetFor(next), {
      type: 'spring',
      velocity: info.velocity.y,
      // A little bounce, since the sheet was thrown.
      bounce: Math.abs(info.velocity.y) > 400 ? 0.15 : 0,
      visualDuration: 0.32,
    });
    if (next !== detent) onDetentChange(next);
  };

  // The grabber is also a button (for keyboard and switch users); a drag that ends on it isn't a tap.
  const cycle = () => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    onDetentChange(detent === 'peek' ? 'half' : detent === 'half' ? 'full' : 'peek');
  };

  return (
    <motion.section
      className={styles.sheet}
      style={{ height: fullHeight, y }}
      aria-label={label}
      drag={reduceMotion ? false : 'y'}
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: offsetFor('peek') }}
      dragElastic={0.12}
      dragMomentum={false}
      onDragStart={() => {
        dragged.current = true;
      }}
      onDragEnd={onDragEnd}
      transition={reduceMotion ? FADE_REDUCED : SPRING_DEFAULT}
    >
      <button
        type="button"
        className={styles.handle}
        onPointerDown={(event) => dragControls.start(event)}
        onClick={cycle}
        aria-label={detent === 'full' ? 'Collapse results' : 'Expand results'}
        aria-expanded={detent !== 'peek'}
      >
        <span className={styles.grabber} aria-hidden="true" />
      </button>
      <div className={styles.header} onPointerDown={(event) => dragControls.start(event)}>
        {header}
      </div>
      <div
        className={styles.content}
        style={{
          paddingBottom: `calc(${offsetFor(detent)}px + var(--space-6) + env(safe-area-inset-bottom))`,
        }}
      >
        {children}
      </div>
    </motion.section>
  );
}
