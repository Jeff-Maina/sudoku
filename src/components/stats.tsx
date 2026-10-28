import { useSudokuStore } from '../store/sudoku-store';
import { Timer } from './timer';

export function Stats() {
  const { isComplete } = useSudokuStore();
  
  return (
    <div className="flex justify-between items-center">
      <Timer />
      
    
    </div>
  );
}