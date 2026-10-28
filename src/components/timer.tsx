import NumberFlow from '@number-flow/react';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { useSudokuStore } from '../store/sudoku-store';

export function Timer() {
  const { startTime, penaltyTime, isComplete, elapsedTime: storedElapsed } = useSudokuStore();
  
  // Local tick for display - initialized to Date.now() so first render is immediate
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    if (isComplete || !startTime) return;
    
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isComplete, startTime]);
  
  // Compute elapsed time safely, clamping to 0 minimum
  const baseElapsed = (() => {
    if (!startTime) return storedElapsed;
    if (isComplete) return storedElapsed;
    
    const diff = Math.floor((now - startTime) / 1000);
    // Clamp to 0 to prevent negative values from timing edge cases
    return Math.max(0, diff);
  })();
  
  const totalTime = baseElapsed + penaltyTime;
  const mins = Math.floor(totalTime / 60);
  const secs = totalTime % 60;
  
  return (
      
    <div className={cn(
      "text-xl! opacity-100! tabular-nums font-medium",
      isComplete ? "text-green-600" : "text-foreground"
    )}>
      <NumberFlow value={mins} format={{ minimumIntegerDigits: 2 }} />
      <span>:</span>
      <NumberFlow value={secs} format={{ minimumIntegerDigits: 2 }} />
    </div>
  );
}