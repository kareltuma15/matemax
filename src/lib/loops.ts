const LOOPS_API = "https://app.loops.so/api/v1";

function loopsKey(): string | null {
  return process.env.LOOPS_API_KEY ?? null;
}

/** Create or update a Loops contact with arbitrary properties. */
export async function upsertLoopsContact(
  email: string,
  props: Record<string, string | number | boolean | null>
): Promise<void> {
  const key = loopsKey();
  if (!key) return;
  await fetch(`${LOOPS_API}/contacts/update`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, ...props }),
  }).catch(() => {}); // fire-and-forget, never throw
}

/** Send a named event to Loops for automation triggers. */
export async function sendLoopsEvent(
  email: string,
  eventName: string,
  props?: Record<string, string | number | boolean>
): Promise<void> {
  const key = loopsKey();
  if (!key) return;
  await fetch(`${LOOPS_API}/events/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, eventName, ...(props ?? {}) }),
  }).catch(() => {});
}
