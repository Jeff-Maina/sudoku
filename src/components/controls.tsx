import {
  ArrowCounterClockwiseIcon,
  LightbulbIcon, NoteIcon
} from "@phosphor-icons/react";
import type { Difficulty } from "../lib/sudoku";
import { cn } from "../lib/utils";
import { MAX_HINTS, useSudokuStore } from "../store/sudoku-store";
import { Button } from "./ui/button";
import { Group, GroupSeparator } from "./ui/group";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "./ui/menu";
export function Controls() {
  const {
    difficulty,
    isNoteMode,
    selectedCell,
    board,
    hintsUsed,
    newGame,
    toggleNoteMode,
    useHint,
    isComplete,
  } = useSudokuStore();

  const difficulties: Difficulty[] = [
    "easy",
    "medium",
    "hard",
    "very-hard",
    "inhuman",
    "insane",
  ];

  const handleNewGame = (diff?: Difficulty) => {
    newGame(diff || difficulty);
  };

  // Hints only make sense for a selected, non-given cell, and are capped
  // per game.
  const hintsRemaining = MAX_HINTS - hintsUsed;
  const canUseHint =
    selectedCell !== null &&
    !board[selectedCell]?.isGiven &&
    hintsRemaining > 0;

  return (
    <div className="flex flex-col gap-2">
      <Group orientation={"vertical"}>
        {/* New Game with Difficulty Menu */}
        <Menu>
          <MenuTrigger render={<Button size={"icon-xl"} variant={"outline"} />}>
            <ArrowCounterClockwiseIcon weight="fill" />
          </MenuTrigger>

          <MenuPopup align="start">
            {difficulties.map((diff) => (
              <MenuItem
                key={diff}
                onClick={() => handleNewGame(diff)}
                className={cn(
                  difficulty === diff && "bg-accent text-accent-foreground"
                )}
              >
                <span className="text-base">
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </span>
              </MenuItem>
            ))}
          </MenuPopup>
        </Menu>

        <GroupSeparator orientation="horizontal" />

        <Button
          onClick={toggleNoteMode}
          className={cn(
            isNoteMode ? "bg-muted! text-foreground" : "text-muted-foreground!"
          )}
          disabled={isComplete}
          variant={"outline"}
          size={"icon-xl"}
          title="Toggle Note Mode"
        >
          <NoteIcon weight="duotone" className="size-5" />
        </Button>
        <GroupSeparator orientation="horizontal" />
        <Button
          onClick={useHint}
          disabled={!canUseHint}
          className={cn("relative text-muted-foreground!")}
          variant={"outline"}
          size={"icon-xl"}
          title={`Get a Hint (${hintsRemaining} left)`}
        >
          <LightbulbIcon weight="duotone" className="size-5" />
          <span className="absolute -top-0 -right-0 flex size-4 items-center justify-center rounded-full text-[10px] text-muted-foreground">
            {hintsRemaining}
          </span>
        </Button>
      </Group>
    </div>
  );
}
