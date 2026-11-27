"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * Oznámení se „Zpět“ (KO-09): vratné akce se neptají, místo toho 10 s nabízí vrácení.
 * Potvrzení zůstává jen u nevratných akcí.
 */
interface Toast { text: string; zpet?: () => Promise<void> | void }
const Ctx = createContext<(t: Toast) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [t, setT] = useState<Toast | null>(null);
  const casovac = useRef<number | null>(null);
  const ukaz = useCallback((x: Toast) => {
    setT(x);
    if (casovac.current) window.clearTimeout(casovac.current);
    casovac.current = window.setTimeout(() => setT(null), 10_000);
  }, []);
  useEffect(() => () => { if (casovac.current) window.clearTimeout(casovac.current); }, []);
  return (
    <Ctx.Provider value={ukaz}>
      {children}
      {t && (
        <div className="a2-toast" role="status" aria-live="polite" data-testid="a2-toast">
          <span>{t.text}</span>
          {t.zpet && <button type="button" onClick={async () => { const z = t.zpet; setT(null); await z?.(); }}>Zpět</button>}
          <button type="button" aria-label="Zavřít" onClick={() => setT(null)}>✕</button>
        </div>
      )}
    </Ctx.Provider>
  );
}
