"use client";

/**
 * Souhlasy a „odkud ses dozvěděl“ z registrace pošle na server (/api/registrace/dokonceni).
 * U registrace přes Google se odpovědi uloží do sessionStorage a odešlou po návratu (ProgressSync).
 */
const KLIC = "matemax-registrace-cekajici";
export interface DataRegistrace { podminky: boolean; novinky: boolean; odkud: string | null }

export function ulozCekajici(d: DataRegistrace): void {
  try { sessionStorage.setItem(KLIC, JSON.stringify(d)); } catch { /* bez úložiště */ }
}

export async function dokonciRegistraci(token: string, d?: DataRegistrace): Promise<void> {
  let data = d;
  if (!data) {
    try { const s = sessionStorage.getItem(KLIC); data = s ? (JSON.parse(s) as DataRegistrace) : undefined; } catch { data = undefined; }
  }
  if (!data) return;
  try {
    const r = await fetch("/api/registrace/dokonceni", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
    if (r.ok) { try { sessionStorage.removeItem(KLIC); } catch { /* nic */ } }
  } catch { /* zkusí se při příštím přihlášení */ }
}
