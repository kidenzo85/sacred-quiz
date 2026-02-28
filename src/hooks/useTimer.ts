import { useState, useEffect, useCallback } from "react";

export function useTimer(initialTime: number, onTimeUp: () => void) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onTimeUp]);

  const start = useCallback(() => {
    setTimeLeft(initialTime);
    setIsRunning(true);
  }, [initialTime]);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setTimeLeft(initialTime);
    setIsRunning(false);
  }, [initialTime]);

  const percentage = (timeLeft / initialTime) * 100;

  return { timeLeft, isRunning, start, stop, reset, percentage };
}
