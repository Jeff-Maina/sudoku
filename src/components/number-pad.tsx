import { useSudokuStore } from "../store/sudoku-store";
import { Button } from "./ui/button";
import { Group } from "./ui/group";

export function NumberPad() {
  const { setCellValue, toggleNote,isComplete, isNoteMode, clearCell, board, selectedCell } = useSudokuStore();
  
  const handleNumberClick = (num: string) => {
    if (isNoteMode) {
      toggleNote(num);
    } else {
      // Get the value of the currently selected cell
      const currentValue = selectedCell !== null ? board[selectedCell]?.value : null;
      
      // If the clicked number matches the current value, clear the cell
      if (currentValue === num) {
        clearCell();
      } else {
        setCellValue(num);
      }

      // playSound(tap)
    }
  };
  
  return (
    <div className="w-full">
      <Group className="grid border-foreground/20! w-full grid-cols-9">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <Button
            key={num}
            disabled={isComplete}
            variant={'outline'}
            onClick={() => handleNumberClick(num.toString())}
            className="min-h-none border-r! font-normal! text-4xl! h-fit! aspect-square! text-foreground hover:text-foreground! w-full"
          >
            {num}
          </Button>
        ))}
     
      </Group>
    </div>
  );
}