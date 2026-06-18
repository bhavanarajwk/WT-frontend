import { ExitInterviewSubmissionDetailPageClient } from "@/components/exit-interview/ExitInterviewSubmissionDetailPageClient";

export default async function ExitInterviewSubmissionDetailPage({
  params,
}: {
  params: Promise<{ empId: string }>;
}) {
  const { empId } = await params;
  return <ExitInterviewSubmissionDetailPageClient lookupId={empId} />;
}
