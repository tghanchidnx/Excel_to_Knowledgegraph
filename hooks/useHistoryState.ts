import { useState, useCallback } from 'react';

const MAX_HISTORY_SIZE = 11; // 10 undo steps + 1 current state

/**
 * A custom hook to manage state with undo/redo functionality.
 * @param initialState The initial state value.
 * @returns A tuple containing the current state, a state setter, undo/redo functions, and flags indicating if undo/redo is possible.
 */
export const useHistoryState = <T>(initialState: T): [
    T, // currentState
    (newState: T | ((prevState: T) => T)) => void, // setState
    () => void, // undo
    () => void, // redo
    boolean, // canUndo
    boolean, // canRedo
    (newState: T) => void // resetState
] => {
    const [history, setHistory] = useState<T[]>([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;

    const setState = useCallback((newStateOrFn: T | ((prevState: T) => T)) => {
        const currentState = history[currentIndex];
        const newState = typeof newStateOrFn === 'function' 
            ? (newStateOrFn as (prevState: T) => T)(currentState) 
            : newStateOrFn;

        // Prevent adding identical state to history
        if (JSON.stringify(currentState) === JSON.stringify(newState)) {
            return;
        }

        const newHistory = [...history.slice(0, currentIndex + 1), newState];
        
        const slicedHistory = newHistory.length > MAX_HISTORY_SIZE 
            ? newHistory.slice(newHistory.length - MAX_HISTORY_SIZE)
            : newHistory;
        
        setHistory(slicedHistory);
        setCurrentIndex(slicedHistory.length - 1);
    }, [history, currentIndex]);
    
    const resetState = useCallback((newState: T) => {
        setHistory([newState]);
        setCurrentIndex(0);
    }, []);

    const undo = useCallback(() => {
        if (canUndo) {
            setCurrentIndex(prevIndex => prevIndex - 1);
        }
    }, [canUndo]);

    const redo = useCallback(() => {
        if (canRedo) {
            setCurrentIndex(prevIndex => prevIndex + 1);
        }
    }, [canRedo]);
    
    return [history[currentIndex], setState, undo, redo, canUndo, canRedo, resetState];
};