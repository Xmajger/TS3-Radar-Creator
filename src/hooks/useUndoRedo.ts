import { useCallback, useState } from 'react';
import type { MapObject } from '../types';

const MAX_HISTORY = 30;

interface HistoryState {
  past: MapObject[][];
  current: MapObject[];
  future: MapObject[][];
}

export function useUndoRedo(initial: MapObject[]) {
  const [hist, setHist] = useState<HistoryState>({
    past: [],
    current: initial,
    future: [],
  });

  const push = useCallback((next: MapObject[]) => {
    setHist(h => {
      const newPast = [...h.past, h.current];
      if (newPast.length > MAX_HISTORY) newPast.shift();
      return { past: newPast, current: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setHist(h => {
      if (h.past.length === 0) return h;
      const newPast = h.past.slice(0, -1);
      const previous = h.past[h.past.length - 1];
      return { past: newPast, current: previous, future: [h.current, ...h.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setHist(h => {
      if (h.future.length === 0) return h;
      const [next, ...newFuture] = h.future;
      return { past: [...h.past, h.current], current: next, future: newFuture };
    });
  }, []);

  const reset = useCallback((next: MapObject[]) => {
    setHist({ past: [], current: next, future: [] });
  }, []);

  return {
    objects: hist.current,
    push,
    undo,
    redo,
    reset,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
  };
}
