import { useState, useCallback } from "react";





export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4800);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
