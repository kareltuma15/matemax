import { redirect } from "next/navigation";

export default async function TreningTemaPage({
  params,
}: {
  params: Promise<{ tema: string }>;
}) {
  const { tema } = await params;
  redirect(`/trenink?tema=${encodeURIComponent(tema)}`);
}
