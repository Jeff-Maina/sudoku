import { useEffect, useState } from 'react';
import type { Difficulty } from '../lib/sudoku';
import { cn } from '../lib/utils';
import { useSudokuStore } from '../store/sudoku-store';
import { Button } from './ui/button';
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from './ui/menu';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'very-hard', 'inhuman', 'insane'];

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function GameCompleteDialog() {
  const { isComplete, elapsedTime, penaltyTime, difficulty, newGame } = useSudokuStore();
  const [open, setOpen] = useState(false);

  // Open automatically the moment the puzzle is solved. Left as its own
  // piece of state (rather than driving `open` straight off `isComplete`)
  // so dismissing the dialog doesn't require clearing game state, and a
  // fresh completion later can reopen it.
  useEffect(() => {
    if (isComplete) {
      setOpen(true);
    }
  }, [isComplete]);

  const totalTime = elapsedTime + penaltyTime;

  const handleRestart = (diff: Difficulty) => {
    setOpen(false);
    newGame(diff);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPopup showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Puzzle complete!</DialogTitle>
          <DialogDescription>
            You finished in {formatTime(totalTime)}
            {penaltyTime > 0 && (
              <> (including {formatTime(penaltyTime)} in penalties)</>
            )}
            .
          </DialogDescription>
        </DialogHeader>
        <DialogFooter variant="bare">
          <Menu>
            <MenuTrigger render={<Button className="w-full" />}>
              Play Again
            </MenuTrigger>
            <MenuPopup align="center">
              {DIFFICULTIES.map((diff) => (
                <MenuItem
                  key={diff}
                  onClick={() => handleRestart(diff)}
                  className={cn(
                    difficulty === diff && 'bg-accent text-accent-foreground'
                  )}
                >
                  <span className="text-base">
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </span>
                </MenuItem>
              ))}
            </MenuPopup>
          </Menu>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}