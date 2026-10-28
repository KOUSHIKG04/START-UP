import { PaymentsScreen } from "@/features/payments";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const { before } = await searchParams;
  return <PaymentsScreen beforeId={before} />;
}
