import GradingForm from "./GradingForm";

export default async function AdminGradingPage({
  params,
}: {
  params: Promise<{ sid: string }>;
}) {
  const { sid } = await params;
  return <GradingForm submissionId={sid} />;
}
