import { Controls } from '../components/controls';
import { NumberPad } from '../components/number-pad';
import { Stats } from '../components/stats';
import { SudokuGrid } from '../components/sudoku-grid';
import { useSudokuGame } from '../hooks/use-sudoku-game';
import useTheme from '../hooks/use-theme';

export function SudokuPage() {
  const { difficulty } = useSudokuGame();
  const { toggle, mode } = useTheme()
  
  return (
    <div className="h-[100vh] flex flex-col items-center justify-center p-4">

      <div className='fixed flex w-full items-center justify-between gap-2 top-0 right-0 p-4'>
        <p className='text-sm font-medium text-blue-400 uppercase'>Sudoku</p>
        <div className="flex items-center gap-2">
          <button onClick={() => toggle()} className='uppercase cursor-pointer text-sm font-medium'>
            [{mode}]
          </button>
        </div>
      </div>
      <div className="flex gap-4 w-full items-center  mx-auto max-w-xl">
        
        <div className="w-full flex flex-col gap-4!">
          <div className='w-full px-4 flex items-center justify-between'>
            <p className='capitalize font-medium text-lg
              '>{difficulty}</p>
            
            <Stats />
          </div>
          <SudokuGrid />
          <NumberPad />
        </div>
        <Controls />
      </div>
      <div className="absolute bottom-4 text-xs left-1/2 -translate-x-2/4">
        <p className='text-muted-foreground'>Built by{" "}
          <a href="https://www.gichuki.me/" target='_blank' className='hover:underline hover:text-secondary-foreground'>
            jeff
          </a>
        </p>
      </div>
    </div>
  );
}