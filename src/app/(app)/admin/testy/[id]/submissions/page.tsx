import SubmissionsList from "./SubmissionsList";

export default async function AdminSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SubmissionsList sessionId={id} />;
}
