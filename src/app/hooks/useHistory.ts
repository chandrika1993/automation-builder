import { useState, useCallback } from "react";

/**
 * useHistory
 *
 * ----> Currently not 100% functional, still needs fixes
 * 
 * My Approach: 
 * 
 * Generic undo/redo stack for any serialisable state value.
 * Maintains a flat array of snapshots and an index pointer —
 * undo/redo simply move the pointer without mutating history.
 *
 * When `set` is called after an undo, all snapshots ahead of the
 * current index are discarded (standard linear undo behaviour).
 *
 * @param initialState - The starting snapshot, placed at index 0.
 * @returns state      - The snapshot at the current index.
 * @returns set        - Record a new snapshot and advance the pointer.
 * @returns undo       - Move the pointer one step back.
 * @returns redo       - Move the pointer one step forward.
 * @returns canUndo    - False when already at the oldest snapshot.
 * @returns canRedo    - False when already at the newest snapshot.
 */
export function useHistory<T>(initialState: T) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  const set = useCallback((newState: T) => {
    setHistory((prev) => {
      // Drop any redo history when a new action is made
      const trimmed = prev.slice(0, index + 1);
      return [...trimmed, newState];
    });
    setIndex((i) => i + 1);
  }, [index]);

  const undo = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const redo = useCallback(() => {
    setIndex((i) => Math.min(history.length - 1, i + 1));
  }, [history.length]);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return { state: history[index], set, undo, redo, canUndo, canRedo };
}