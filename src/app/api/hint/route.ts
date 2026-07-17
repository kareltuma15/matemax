import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  // Bez API klíče funkci raději vypneme — klient pak hint tlačítko skryje,
  // místo aby žákovi ukazoval chybu.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI hint není nastavený", unavailable: true }, { status: 503 });
  }
  if (!rateLimit(`hint:${clientIp(req)}`, 10, 5 * 60_000)) {
    return NextResponse.json({ error: "Příliš mnoho požadavků, zkus to za chvíli." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { zadani, odpoved, tema, podtema, chybna_odpoved } = body as {
    zadani?: string;
    odpoved?: string;
    tema?: string;
    podtema?: string;
    chybna_odpoved?: string;
  };

  if (!zadani || !odpoved || !tema) {
    return NextResponse.json({ error: "Chybí povinná pole" }, { status: 400 });
  }

  const cleanZadani = String(zadani).trim().slice(0, 500);
  const cleanOdpoved = String(odpoved).trim().slice(0, 100);
  const cleanTema = String(tema).trim().slice(0, 100);
  const cleanPodtema = podtema ? String(podtema).trim().slice(0, 100) : "";
  const cleanChybna = chybna_odpoved ? String(chybna_odpoved).trim().slice(0, 100) : "";

  const prompt = `Jsi matematický tutor pro žáky 9. třídy ZŠ v České republice připravující se na přijímací zkoušky CERMAT.

Žák řeší matematický příklad a udělal chybu. Dej mu krátký, personalizovaný hint.

Příklad: ${cleanZadani}
Téma: ${cleanTema}${cleanPodtema ? ` (${cleanPodtema.replace(/_/g, " ")})` : ""}
Správná odpověď: ${cleanOdpoved}
Žákova špatná odpověď: ${cleanChybna || "(neuvedena)"}

Napiš hint (2–3 věty) v češtině, který:
- Adresuje konkrétní chybu žáka (viz jeho špatná odpověď)
- Napoví správný postup řešení, ale NEPROZRAĎ přímou odpověď
- Je přátelský, stručný a konkrétní
- Může obsahovat mezikrok nebo vzorec

Hint:`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const hint = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    return NextResponse.json({ hint });
  } catch (err) {
    console.error("[hint] Anthropic error:", err);
    return NextResponse.json({ error: "Hint se nepodařilo načíst." }, { status: 500 });
  }
}
