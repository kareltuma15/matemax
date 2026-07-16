import TestRoom from "./TestRoom";

export default async function TestRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TestRoom sessionId={id} />;
}
