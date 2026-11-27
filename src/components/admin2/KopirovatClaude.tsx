"use client";

import { useState } from "react";

/** „Kopírovat pro Clauda“ (PL-07): zkopíruje shrnutí v markdownu. Obsahuje jen pseudonym, nikdy jméno, e-mail ani ID. */
export default function KopirovatClaude({ text, popis = "Kopírovat pro Clauda" }: { text: string; popis?: string }) {
  const [stav, setStav] = useState<"" | "ok" | "chyba">("");
  return (
    <div className="a2-sekce">
      <button type="button" className="a2-btn a2-sek a2-male" style={{ alignSelf: "flex-start" }} data-testid="a2-kopirovat-claude"
        onClick={async () => { try { await navigator.clipboard.writeText(text); setStav("ok"); } catch { setStav("chyba"); } }}>
        {stav === "ok" ? "Zkopírováno ✓" : popis}
      </button>
      {stav === "chyba" && <textarea readOnly value={text} rows={6} onFocus={(e) => e.currentTarget.select()} aria-label="Text ke zkopírování" />}
    </div>
  );
}
