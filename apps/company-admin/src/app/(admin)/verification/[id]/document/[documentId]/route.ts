import { NextResponse } from "next/server";
import { getCompanyVerificationCase } from "@startup/data-access";
import { requireReviewer } from "@/lib/reviewer";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  
  const [{ id, documentId }, client] = await Promise.all([
    params,
    requireReviewer(),
  ]);

  const item = await getCompanyVerificationCase(client, id);
  
  const document = item?.documents.find(
    (candidate) => candidate.id === documentId
  );

  if (!document) return new Response("Document not found", { status: 404 });
  
  const { data, error } = await client.storage
    .from(document.bucket_id)
    .createSignedUrl(document.storage_path, 60);

  if (error || !data)
    return new Response("Document unavailable", { status: 503 });
  
  return NextResponse.redirect(data.signedUrl);
}
