import { useEffect } from 'react';
import { useSudokuStore } from '../store/sudoku-store';

export function useSudokuGame() {
  const {
    board,
    selectedCell,
    difficulty,
    isNoteMode,
    elapsedTime,
    isComplete,
    selectCell,
    setCellValue,
    toggleNote,
    toggleNoteMode,
    clearCell,
    newGame,
    resetGame,
    updateElapsedTime,
    
  } = useSudokuStore();
  
  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      updateElapsedTime();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [updateElapsedTime]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedCell === null) return;
      
      const key = e.key;
      
      // Number keys
      if (key >= '1' && key <= '9') {
        if (isNoteMode) {
          toggleNote(key);
        } else {
          setCellValue(key);
        }
      }
      
      // Delete/Backspace
      if (key === 'Delete' || key === 'Backspace') {
        clearCell();
      }
      
      // Arrow keys for navigation
      if (selectedCell !== null) {
        let newIndex = selectedCell;
        if (key === 'ArrowUp') newIndex = Math.max(0, selectedCell - 9);
        if (key === 'ArrowDown') newIndex = Math.min(80, selectedCell + 9);
        if (key === 'ArrowLeft') newIndex = selectedCell % 9 === 0 ? selectedCell : selectedCell - 1;
        if (key === 'ArrowRight') newIndex = selectedCell % 9 === 8 ? selectedCell : selectedCell + 1;
        
        if (newIndex !== selectedCell) {
          selectCell(newIndex);
        }
      }
      
      // N for note mode
      if (key === 'n' || key === 'N') {
        toggleNoteMode();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, isNoteMode, setCellValue, toggleNote, clearCell, selectCell, toggleNoteMode]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return {
    board,
    selectedCell,
    difficulty,
    isNoteMode,
    elapsedTime,
    isComplete,
    selectCell,
    setCellValue,
    toggleNote,
    toggleNoteMode,
    clearCell,
    newGame,
    resetGame,
    formatTime,
  };
}