export default async function RfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <h1 className="text-2xl font-bold">פרטי בקשה — {id}</h1>;
}
