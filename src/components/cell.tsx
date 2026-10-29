import { memo, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { useSudokuStore } from '../store/sudoku-store';

import { playSound } from '../lib/play-sound';

const success = {
  "layers": [
    {
      "source": {
        "type": "sine",
        "frequency": 758.9614922717362
      },
      "envelope": {
        "attack": 0.002,
        "decay": 0.06495529631984284,
        "sustain": 0,
        "release": 0.004,
        "curve": "ramp"
      },
      "gain": 0.195,
      "effects": [
        {
          "type": "delay",
          "delay": 0.065,
          "feedback": 0.16,
          "wet": 0.1,
          "lowpass": 4200
        }
      ]
    },
    {
      "source": {
        "type": "sine",
        "frequency": 1138.4422384076045
      },
      "envelope": {
        "attack": 0.002,
        "decay": 0.05377125950796601,
        "sustain": 0,
        "release": 0.004,
        "curve": "ramp"
      },
      "gain": 0.195,
      "delay": 0.042622561884206996,
      "effects": [
        {
          "type": "delay",
          "delay": 0.065,
          "feedback": 0.16,
          "wet": 0.1,
          "lowpass": 4200
        }
      ]
    },
    {
      "source": {
        "type": "sine",
        "frequency": 1707.6633576114066
      },
      "envelope": {
        "attack": 0.002,
        "decay": 0.06823578874403216,
        "sustain": 0,
        "release": 0.004,
        "curve": "ramp"
      },
      "gain": 0.195,
      "delay": 0.08524512376841399,
      "effects": [
        {
          "type": "delay",
          "delay": 0.065,
          "feedback": 0.16,
          "wet": 0.1,
          "lowpass": 4200
        }
      ]
    }
  ]
};

const tapSound = {
  "layers": [
    {
      "source": {
        "type": "sine",
        "frequency": 1759.975613097278,
        "fm": {
          "ratio": 0.4648651654464985,
          "depth": 31.8793455976239
        }
      },
      "envelope": {
        "attack": 0,
        "decay": 0.015628252177577004,
        "sustain": 0,
        "release": 0.005642095665840542
      },
      "gain": 0.277
    },
    {
      "source": {
        "type": "sine",
        "frequency": 879.987806548639,
        "fm": {
          "ratio": 0.45409760359030976,
          "depth": 37.517603084929135
        }
      },
      "envelope": {
        "attack": 0,
        "decay": 0.017585253649370945,
        "sustain": 0,
        "release": 0.005710652761690256
      },
      "gain": 0.136,
      "delay": 0.06657829501699203
    }
  ]
};

const warningSound = {
  "layers": [
    {
      "source": {
        "type": "triangle",
        "frequency": 350.8026007072346
      },
      "envelope": {
        "attack": 0.004,
        "decay": 0.16290566145212826,
        "sustain": 0,
        "release": 0.004,
        "curve": "ramp"
      },
      "gain": 0.177,
      "filter": {
        "type": "lowpass",
        "frequency": 592.060810613974,
        "Q": 1
      }
    },
    {
      "source": {
        "type": "triangle",
        "frequency": 329.7770403345314
      },
      "envelope": {
        "attack": 0.004,
        "decay": 0.1347653927437854,
        "sustain": 0,
        "release": 0.004,
        "curve": "ramp"
      },
      "gain": 0.17,
      "delay": 0.14334097370681545,
      "filter": {
        "type": "lowpass",
        "frequency": 677.0055373634046,
        "Q": 1
      }
    }
  ]
};

interface CellProps {
  index: number;
  value: string;
  notes: string[];
  isGiven: boolean;
  isSelected: boolean;
  isRelated: boolean;
  isSameValue: boolean;
  onClick: () => void;
}

export const Cell = memo(function Cell({
  index,
  value,
  notes,
  isGiven,
  isSelected,
  isRelated,
  isSameValue,
  onClick,
}: CellProps) {
  const { board, lastCompletedUnit,clearCell } = useSudokuStore();
  const prevConflictRef = useRef(false);
  const isFirstRenderRef = useRef(true);
  const prevValueRef = useRef(value);
  
  const row = Math.floor(index / 9);
  const col = index % 9;
  
  // --- Conflict Detection ---
  // A cell is a "duplicate" if its value collides with another cell in the
  // same row/column/box, regardless of whether either cell is a given.
  // This is computed for ALL non-empty cells (not just user-entered ones) so
  // that a given cell which is the *cause* of a user's conflict can still be
  // identified and styled, even though it isn't itself "wrong".
  const isDuplicate = value !== '' && (() => {
    const currentRowVals = board.slice(row * 9, (row + 1) * 9).map(c => c?.value);
    const currentColVals = board.filter((_, i) => i % 9 === col).map(c => c?.value);

    const boxStartRow = Math.floor(row / 3) * 3;
    const boxStartCol = Math.floor(col / 3) * 3;
    const currentBoxVals: string[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        currentBoxVals.push(board[(boxStartRow + r) * 9 + (boxStartCol + c)]?.value || '');
      }
    }

    const countInRow = currentRowVals.filter(v => v === value).length;
    const countInCol = currentColVals.filter(v => v === value).length;
    const countInBox = currentBoxVals.filter(v => v === value).length;

    return countInRow > 1 || countInCol > 1 || countInBox > 1;
  })();

  // This specific cell is an invalid user entry: gets the "error" treatment
  // (red text, underline, shake, warning sound).
  const hasConflict = !isGiven && isDuplicate;

  // This cell shares the duplicated value but isn't itself flagged as an
  // error (typically a given cell that a user entry conflicts with, or any
  // other duplicate-causing cell). Gets a lighter highlight so the player
  // can see exactly which cell(s) it collides with.
  const isConflictPeer = isDuplicate && !hasConflict;

  // --- Completed Unit Animation ---
  // lastCompletedUnit bundles the indices of every unit (row/col/box) that
  // just became complete in one move, which cell actually triggered it, and
  // an id used to key effects to a specific completion event. Clearing the
  // state after the animation finishes is owned by the store (one timer,
  // scaled to the farthest ripple distance) rather than by each cell, so a
  // nearby cell's short animation can't cut off a farther one mid-ripple.
  const isCompleted = lastCompletedUnit?.indices.includes(index) ?? false;

  // The cell whose entry actually completed the unit(s) gets a distinct,
  // bigger "hero" animation. Every other completed cell ripples outward
  // from it, delayed proportionally to how far away it is (Chebyshev
  // distance, i.e. grid steps in any direction) so the effect visibly
  // radiates from the cell the player just filled in.
  const isHero = isCompleted && lastCompletedUnit?.triggerIndex === index;

  const rippleDistance = isCompleted && lastCompletedUnit
    ? (() => {
        const triggerRow = Math.floor(lastCompletedUnit.triggerIndex / 9);
        const triggerCol = lastCompletedUnit.triggerIndex % 9;
        return Math.max(Math.abs(row - triggerRow), Math.abs(col - triggerCol));
      })()
    : 0;

  const RIPPLE_STEP_MS = 45;
  const completedDelayStyle = isCompleted
    ? { animationDelay: `${rippleDistance * RIPPLE_STEP_MS}ms` }
    : undefined;

  // Success sound (once per completion, not once per completed cell)
  // A single move can complete up to 25 cells at once (row + col + box), so
  // every Cell seeing `isCompleted` flip true would each try to play the
  // sound - firing it up to 25 times on top of itself. Only the trigger
  // cell plays it, keyed on the completion's id so it fires once per
  // distinct completion rather than on every render.
  useEffect(() => {
    if (isHero) {
      playSound(success);
    }
  }, [isHero, lastCompletedUnit?.id]);

  // --- Sound Effect Logic ---
  
  // 1. Warning Sound (on conflict start)
  useEffect(() => {
    if (hasConflict && !prevConflictRef.current) {
      playSound(warningSound);
    }
    prevConflictRef.current = hasConflict;
  }, [hasConflict]);

  // 2. Tap Sound (on valid value change)
  useEffect(() => {
    // Skip the very first render to avoid playing sound on page load
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevValueRef.current = value;
      return;
    }

    // Check if value actually changed
    if (value !== prevValueRef.current) {
      // Only play tap if:
      // 1. It's not a given (givens don't change)
      // 2. There is no conflict (invalid inputs get warning sound instead)
      // 3. The new value is not empty (clearing usually doesn't need a tap, or you can add one)
      if (!isGiven && !hasConflict && value !== '') {
        playSound(tapSound);
      }
    }
    
    prevValueRef.current = value;
  }, [value, isGiven, hasConflict]);

  // --- Border Styling ---
  const borderRight = col !== 8 && col % 3 === 2 
    ? 'border-r border-r-foreground/20!' 
    : col !== 8 
      ? 'border-r border-border' 
      : '';
  
  const borderBottom = row !== 8 && row % 3 === 2 
    ? 'border-b border-b-foreground/20!' 
    : row !== 8 
      ? 'border-b border-border' 
      : '';

  return (
    <button
      onDoubleClick={clearCell}
      onClick={onClick}
      style={isCompleted ? completedDelayStyle : undefined}
      className={cn(
        'relative group w-full h-full flex items-center justify-center text-4xl transition-colors',
        'aspect-square',
        borderRight,
        borderBottom,
        index === 0 && "rounded-tl-2xl",
        index === 8 && "rounded-tr-2xl",
        index === 80 && "rounded-br-2xl",
        index === 72 && "rounded-bl-2xl",

        // Highlighting
        isSelected && 'bg-primary/10 border-2! border-primary! hover:bg-primary/10! z-0!',
        !isSelected && isRelated && 'bg-primary/5',
        !isSelected && isSameValue && 'bg-primary/10',
        // Text Colors
        isGiven ? 'text-foreground!' : 'text-blue-500 font-hand',
        // Conflict Styling - the invalid entry itself
        hasConflict && 'bg-red-500/20 hover:bg-red-500/20!',
        hasConflict && isSelected && 'border-red-500!',
        // Conflict Styling - the other cell(s) it conflicts with
        !hasConflict && isConflictPeer && 'bg-red-500/10',
        !hasConflict && isConflictPeer && isSelected && 'border-red-500!',
        // Completed unit glow - bigger/brighter on the trigger cell, a
        // lighter ripple ring on the rest, arriving with the same delay
        // as their pop so the glow and the pop read as one motion.
        isHero && 'animate-completed-ring-hero z-10',
        isCompleted && !isHero && 'animate-completed-ring z-10',
        !value && !isGiven && 'hover:bg-muted'
      )}
    >
      {value ? (
        // --- Main Value Display ---
        <span
          style={completedDelayStyle}
          className={cn(
            hasConflict && 'text-red-600 underline underline-offset-4 animate-shake',
            !hasConflict && isConflictPeer && 'text-red-500/80',
            isHero && 'animate-pop-in z-10',
            isCompleted && !isHero && 'animate-pop-in-ripple z-10',
          )}
        >
          {value}
        </span>
      ) : (
        // --- Notes Grid (3x3) ---
        <div className={cn(
          "grid grid-cols-3 grid-rows-3 w-full h-full p-1 gap-0.5",
          !isSelected && "pointer-events-none"
        )}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
            const isActive = notes.includes(num.toString());
            return (
              <div
                key={num}
                className={cn(
                  'flex items-center justify-center text-[16px]! leading-none select-none rounded-sm transition-all',
                  isActive 
                    ? 'text-muted-foreground font-medium' 
                    : 'text-transparent',
                )}
              >
                {num}
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
});