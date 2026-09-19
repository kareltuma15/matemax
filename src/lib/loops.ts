const LOOPS_API = "https://app.loops.so/api/v1";

function loopsKey(): string | null {
  return process.env.LOOPS_API_KEY ?? null;
}

// fetch při HTTP chybě (401, 400 „vlastnost neexistuje", 429…) nevyhodí výjimku, proto se
// odpověď musí zkontrolovat, jinak by integrace selhávala potichu. Nikdy nevyhazuje.
async function loopsCall(path: string, method: "PUT" | "POST", key: string, body: unknown): Promise<void> {
  try {
    const res = await fetch(`${LOOPS_API}/${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`[loops] ${path} selhalo:`, res.status, (await res.text().catch(() => "")).slice(0, 300));
    }
  } catch (err) {
    console.error(`[loops] ${path} výjimka:`, err);
  }
}

/** Create or update a Loops contact with arbitrary properties. */
export async function upsertLoopsContact(
  email: string,
  props: Record<string, string | number | boolean | null>
): Promise<void> {
  const key = loopsKey();
  if (!key) return;
  await loopsCall("contacts/update", "PUT", key, { email, ...props });
}

/** Send a named event to Loops for automation triggers. */
export async function sendLoopsEvent(
  email: string,
  eventName: string,
  props?: Record<string, string | number | boolean>
): Promise<void> {
  const key = loopsKey();
  if (!key) return;
  await loopsCall("events/send", "POST", key, { email, eventName, ...(props ?? {}) });
}
