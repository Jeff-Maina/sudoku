import { useSudokuStore } from '../store/sudoku-store';
import { Cell } from './cell';
import { Card } from "./ui/card"
import { CheckCircleIcon } from '@phosphor-icons/react';
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from './ui/menu';
import { Button } from './ui/button';
import type { Difficulty } from '../lib/sudoku';
import { cn } from '../lib/utils';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'very-hard', 'inhuman', 'insane'];


export function SudokuGrid() {
  const { board, selectedCell, newGame, isComplete, difficulty, selectCell } = useSudokuStore();
  
  const handleCellClick = (index: number) => {
    selectCell(index);
  };
  
  // Get highlighting info
  const selectedValue = selectedCell !== null ? board[selectedCell]?.value : null;
  
  const getCellHighlight = (index: number) => {
    if (selectedCell === null) return { isRelated: false, isSameValue: false };
    
    const selectedRow = Math.floor(selectedCell / 9);
    const selectedCol = selectedCell % 9;
    const selectedBox = Math.floor(selectedRow / 3) * 3 + Math.floor(selectedCol / 3);
    
    const row = Math.floor(index / 9);
    const col = index % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    
    const isRelated = 
      row === selectedRow || 
      col === selectedCol || 
      box === selectedBox;
    
    const isSameValue = 
      selectedValue !== '' && 
      board[index]?.value === selectedValue && 
      index !== selectedCell;
    
    return { isRelated, isSameValue };
  };
  
  const handleRestart = (diff: Difficulty) => {
    newGame(diff);
  };
  return (
    <>
      <Card className="w-full mx-auto overflow-hidden border-foreground/20">
        <div className="grid grid-cols-9 relative  ">
          {board.map((cell, index) => {
            const { isRelated, isSameValue } = getCellHighlight(index);
            
            return (
              <Cell
                key={index}
                index={index}
                value={cell?.value || ''}
                notes={cell?.notes || []}
                isGiven={cell?.isGiven || false}
                isSelected={selectedCell === index}
                isRelated={isRelated}
                isSameValue={isSameValue}
                onClick={() => handleCellClick(index)}
              />
            );
          })}

     {isComplete &&     <div className="absolute size-full z-20 bg-background/50 backdrop-blur-xl grid place-items-center">
                 <div className="flex flex-col items-center justify-center gap-4">
                   <CheckCircleIcon size={32} weight='fill' className='text-success' />
                   <h1>Puzzle solved</h1>
                   <Menu>
                     <MenuTrigger render={<Button variant={'outline'} className="w-full" />}>
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
                   </Menu>            </div>
               </div>}
        </div>
      </Card>
    </>
  );
}