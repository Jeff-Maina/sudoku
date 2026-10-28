import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generate, solve, type Board, DIFFICULTY, boardStringToGrid } from '../lib/sudoku';

type Difficulty = keyof typeof DIFFICULTY;

export const MAX_HINTS = 3;

interface CellData {
  value: string;
  notes: string[];
  isGiven: boolean;
}

interface CompletedUnit {
  // Union of every cell index that belongs to a unit (row/col/box) which
  // just became complete as a result of the last move. Can span more than
  // one unit at once (e.g. a move that finishes a row AND a box).
  indices: number[];
  // The cell whose entry actually completed the unit(s) - the "hero" cell.
  // Every other index in `indices` ripples outward from this one.
  triggerIndex: number;
  // Monotonically increasing id. Used so a stale setTimeout from a previous
  // completion can't clear out a newer one that replaced it.
  id: number;
}

interface SudokuState {
  // Game state
  puzzle: Board | null;
  solution: Board | null;
  board: (CellData | null)[];
  difficulty: Difficulty;
  selectedCell: number | null;
  isNoteMode: boolean;
  // When on, entering a value that doesn't match the solution costs 15s
  // on the clock instead of just showing a conflict.
  isHardcoreMode: boolean;
  startTime: number | null;
  elapsedTime: number;
  isComplete: boolean;
  penaltyTime: number;
  hintsUsed: number;
  lastCompletedUnit: CompletedUnit | null;
  
  // Actions
  newGame: (difficulty: Difficulty) => void;
  selectCell: (index: number | null) => void;
  setCellValue: (value: string) => void;
  toggleNote: (value: string) => void;
  toggleNoteMode: () => void;
  toggleHardcoreMode: () => void;
  useHint: () => void;
  clearCell: () => void;
  checkSolution: () => boolean;
  resetGame: () => void;
  updateElapsedTime: () => void;
  addPenalty: (seconds: number) => void;
  clearCompletedUnit: (id?: number) => void;
  checkUnitCompletion: (index: number, value: string) => void;
}

const createEmptyBoard = (): (CellData | null)[] => {
  return Array(81).fill(null).map(() => ({
    value: '',
    notes: [],
    isGiven: false,
  }));
};

export const useSudokuStore = create<SudokuState>()(
  persist(
    (set, get) => ({
      puzzle: null,
      solution: null,
      board: createEmptyBoard(),
      difficulty: 'easy',
      selectedCell: null,
      isNoteMode: false,
      isHardcoreMode: true,
      startTime: null,
      elapsedTime: 0,
      isComplete: false,
      penaltyTime: 0,
      hintsUsed: 0,
      lastCompletedUnit: null,
      
      newGame: (difficulty) => {
        const puzzle = generate(difficulty);
        const solution = solve(puzzle);
        
        if (!solution) return;
        
        const board = createEmptyBoard();
        const puzzleGrid = boardStringToGrid(puzzle);
        
        let index = 0;
        for (let row = 0; row < 9; row++) {
          for (let col = 0; col < 9; col++) {
            const value = puzzleGrid[row][col];
            if (value !== '.') {
              board[index] = {
                value,
                notes: [],
                isGiven: true,
              };
            }
            index++;
          }
        }
        
        set({
          puzzle,
          solution,
          board,
          difficulty,
          selectedCell: null,
          isNoteMode: false,
          startTime: Date.now(),
          elapsedTime: 0,
          penaltyTime: 0,
          hintsUsed: 0,
          isComplete: false,
          lastCompletedUnit: null,
        });
      },
      
      selectCell: (index) => {
        set({ selectedCell: index });
      },
      
      setCellValue: (value) => {
        const { board, selectedCell, solution, isHardcoreMode } = get();
        if (selectedCell === null || board[selectedCell]?.isGiven) return;
        
        const newBoard = [...board];
        newBoard[selectedCell] = {
          ...newBoard[selectedCell]!,
          value,
          notes: [],
        };
        
        set({ board: newBoard });

        // Hardcore mode: a move that doesn't match the solution costs time
        // on the clock rather than just showing a conflict. Clearing a cell
        // (value === '') is never penalized.
        if (isHardcoreMode && value !== '' && solution && solution[selectedCell] !== value) {
          get().addPenalty(15);
        }
        
        // Check for unit completion
        get().checkUnitCompletion(selectedCell, value);
        get().checkSolution();
      },
      
      toggleNote: (value) => {
        const { board, selectedCell } = get();
        if (selectedCell === null || board[selectedCell]?.isGiven) return;
        
        const newBoard = [...board];
        const cell = { ...newBoard[selectedCell]! };
        
        if (cell.notes.includes(value)) {
          cell.notes = cell.notes.filter(n => n !== value);
        } else {
          cell.notes = [...cell.notes, value].sort();
        }
        
        newBoard[selectedCell] = cell;
        set({ board: newBoard });
      },
      
      toggleNoteMode: () => {
        set((state) => ({ isNoteMode: !state.isNoteMode }));
      },

      toggleHardcoreMode: () => {
        set((state) => ({ isHardcoreMode: !state.isHardcoreMode }));
      },

      useHint: () => {
        const { board, solution, selectedCell, hintsUsed } = get();
        if (selectedCell === null || !solution) return;
        if (board[selectedCell]?.isGiven) return;
        if (hintsUsed >= MAX_HINTS) return;

        const correctValue = solution[selectedCell];
        const newBoard = [...board];
        newBoard[selectedCell] = {
          value: correctValue,
          notes: [],
          isGiven: false,
        };

        set({ board: newBoard, hintsUsed: hintsUsed + 1 });

        // A hint is always correct, so it goes through the same completion
        // checks as a normal entry but never triggers the hardcore penalty.
        get().checkUnitCompletion(selectedCell, correctValue);
        get().checkSolution();
      },
      
      clearCell: () => {
        const { board, selectedCell } = get();
        if (selectedCell === null || board[selectedCell]?.isGiven) return;
        
        const newBoard = [...board];
        newBoard[selectedCell] = {
          value: '',
          notes: [],
          isGiven: false,
        };
        
        set({ board: newBoard });
      },
      
      checkUnitCompletion: (index: number, value: string) => {
        const { board, solution } = get();
        if (!solution || !board) return;

        // Only trigger if the value entered is correct
        if (solution[index] !== value) return;

        const row = Math.floor(index / 9);
        const col = index % 9;
        const boxStartRow = Math.floor(row / 3) * 3;
        const boxStartCol = Math.floor(col / 3) * 3;

        // Helper to check if a unit is complete and correct
        const isUnitComplete = (indices: number[]) => {
          return indices.every(i => board[i]?.value === solution[i]);
        };

        // Check every unit this cell belongs to (row, column, box) and union
        // the indices of every one that just completed - a single move can
        // complete more than one unit at once, and all of them should animate.
        const completedIndices = new Set<number>();

        const rowIndices = Array.from({ length: 9 }, (_, i) => row * 9 + i);
        if (isUnitComplete(rowIndices)) {
          rowIndices.forEach(i => completedIndices.add(i));
        }

        const colIndices = Array.from({ length: 9 }, (_, i) => i * 9 + col);
        if (isUnitComplete(colIndices)) {
          colIndices.forEach(i => completedIndices.add(i));
        }

        const boxIndices: number[] = [];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            boxIndices.push((boxStartRow + r) * 9 + (boxStartCol + c));
          }
        }
        if (isUnitComplete(boxIndices)) {
          boxIndices.forEach(i => completedIndices.add(i));
        }

        if (completedIndices.size > 0) {
          const nextId = (get().lastCompletedUnit?.id ?? 0) + 1;

          set({
            lastCompletedUnit: {
              indices: Array.from(completedIndices),
              triggerIndex: index,
              id: nextId,
            },
          });

          // Clearing is owned centrally here (rather than each Cell running
          // its own timer) so a nearby cell's short timer can never wipe the
          // highlight out from under a farther cell that's still rippling.
          // Duration = time for the ripple to reach the farthest completed
          // cell, plus enough buffer for that cell's own pop animation to
          // finish playing.
          const triggerRow = Math.floor(index / 9);
          const triggerCol = index % 9;
          let maxDistance = 0;
          for (const i of completedIndices) {
            const r = Math.floor(i / 9);
            const c = i % 9;
            const distance = Math.max(Math.abs(r - triggerRow), Math.abs(c - triggerCol));
            if (distance > maxDistance) maxDistance = distance;
          }

          const RIPPLE_STEP_MS = 45;
          const ANIMATION_BUFFER_MS = 950; // covers the hero pop-in (~0.9s) with margin
          const clearAfterMs = maxDistance * RIPPLE_STEP_MS + ANIMATION_BUFFER_MS;

          setTimeout(() => {
            get().clearCompletedUnit(nextId);
          }, clearAfterMs);
        }
      },

      clearCompletedUnit: (id?: number) => {
        set((state) => {
          // If a specific id was requested and it no longer matches the
          // current completion, a newer one has already replaced it -
          // don't clear it out from under that newer animation.
          if (id !== undefined && state.lastCompletedUnit?.id !== id) {
            return state;
          }
          return { lastCompletedUnit: null };
        });
      },
      
      checkSolution: () => {
        const { board, solution } = get();
        if (!solution || !board) return false;
        
        const isComplete = board.every((cell, index) => {
          return cell?.value === solution[index];
        });
        
        if (isComplete) {
          set({ isComplete: true });
        }
        
        return isComplete;
      },
      
      resetGame: () => {
        const { difficulty } = get();
        get().newGame(difficulty);
      },
      
      updateElapsedTime: () => {
        const { startTime, isComplete } = get();
        if (startTime && !isComplete) {
          set({ elapsedTime: Math.floor((Date.now() - startTime) / 1000) });
        }
      },

      addPenalty: (seconds) => {
        set((state) => ({ penaltyTime: state.penaltyTime + seconds }));
      },
    }),
    {
      name: 'sudoku-current-game',
      partialize: (state) => ({
        puzzle: state.puzzle,
        solution: state.solution,
        board: state.board,
        difficulty: state.difficulty,
        isHardcoreMode: state.isHardcoreMode,
        elapsedTime: state.elapsedTime,
        penaltyTime: state.penaltyTime,
        hintsUsed: state.hintsUsed,
        isComplete: state.isComplete,
      }),
      onRehydrateStorage: (state) => {
        if (state && state.elapsedTime > 0 && !state.isComplete) {
           state.startTime = Date.now() - (state.elapsedTime * 1000);
        }
      }
    }
  )
);