import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyVerificationCase } from "@startup/data-access";
import { requireReviewer } from "@/lib/reviewer";
import { StatusBadge } from "@/features/verification/status-badge";
import { DocumentActions, FinalizeAction } from "./review-forms";

const documentNames: Record<string, string> = {
  medical_registration: "Medical registration certificate",
  registration_certificate: "Registration certificate",
  operating_licence: "Operating licence",
  aadhaar: "Aadhaar",
  pan: "PAN",
  driving_licence: "Driving licence",
  vehicle_rc: "Vehicle registration certificate",
  insurance: "Insurance",
  fitness: "Fitness certificate",
  ambulance_image: "Ambulance image",
  equipment_images: "Equipment images",
};

export default async function CaseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, client] = await Promise.all([params, requireReviewer()]);
  const item = await getCompanyVerificationCase(client, id);
  if (!item) notFound();
  const current = item.documents.filter(
    (document) => document.status !== "superseded"
  );
  const allApproved =
    current.length > 0 &&
    current.every((document) => document.status === "approved");
  const details = item.doctor ?? item.facility ?? item.driver;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/verification"
        className="text-primary text-sm font-medium hover:underline"
      >
        ← Back to queue
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {item.subject_name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm capitalize">
            {item.subject_type === "facility"
              ? "Hospital / clinic"
              : item.subject_type}{" "}
            verification · Submitted{" "}
            {new Date(item.submitted_at).toLocaleDateString("en-IN")}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </header>
      <section className="bg-card rounded-xl border p-5">
        <h2 className="font-semibold">Submitted information</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {Object.entries(details ?? {})
            .filter(([, value]) => value != null)
            .map(([key, value]) => (
              <div key={key}>
                <dt className="text-muted-foreground text-xs capitalize">
                  {key.replaceAll("_", " ")}
                </dt>
                <dd className="mt-1 font-medium">{String(value)}</dd>
              </div>
            ))}
        </dl>
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">Documents</h2>
          <p className="text-muted-foreground text-sm">
            Open each file and record an individual decision.
          </p>
        </div>
        {current.map((document) => (
          <article key={document.id} className="bg-card rounded-xl border p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">
                  {documentNames[document.kind] ??
                    document.kind.replaceAll("_", " ")}
                </h3>
                <p className="text-muted-foreground text-xs">
                  Version {document.version} · Submitted{" "}
                  {new Date(document.submitted_at).toLocaleDateString("en-IN")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-muted rounded-full px-2.5 py-1 text-xs capitalize">
                  {document.status}
                </span>
                <a
                  href={`/verification/${id}/document/${document.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                >
                  View document
                </a>
              </div>
            </div>
            {document.rejection_reason && (
              <p className="bg-destructive/10 text-destructive mt-3 rounded-md p-3 text-sm">
                {document.rejection_reason}
              </p>
            )}
            {document.status === "pending" && (
              <DocumentActions caseId={id} documentId={document.id} />
            )}
          </article>
        ))}
        {!current.length && (
          <p className="bg-card text-muted-foreground rounded-xl border p-8 text-center text-sm">
            No documents have been submitted for this case.
          </p>
        )}
      </section>
      {item.status !== "verified" && (
        <section className="bg-card rounded-xl border p-5">
          <h2 className="font-semibold">Complete verification</h2>
          <p className="text-muted-foreground mt-1 mb-4 text-sm">
            Every required document must be approved before this case can be
            verified.
          </p>
          {allApproved ? (
            <FinalizeAction caseId={id} subjectType={item.subject_type} />
          ) : (
            <p className="text-muted-foreground text-sm">
              Review all pending or rejected documents first.
            </p>
          )}
        </section>
      )}
      <section className="bg-card rounded-xl border p-5">
        <h2 className="font-semibold">Verification history</h2>
        <ol className="mt-4 divide-y">
          {item.history.map((event) => (
            <li
              key={`${event.created_at}-${event.action}-${event.document_id ?? "case"}`}
              className="py-3 text-sm"
            >
              <div className="flex justify-between gap-3">
                <span className="font-medium capitalize">
                  {event.action.replaceAll("_", " ")}
                </span>
                <time className="text-muted-foreground">
                  {new Date(event.created_at).toLocaleString("en-IN")}
                </time>
              </div>
              {event.reason && (
                <p className="text-muted-foreground mt-1">{event.reason}</p>
              )}
            </li>
          ))}
        </ol>
        {!item.history.length && (
          <p className="text-muted-foreground mt-3 text-sm">
            No decisions recorded yet.
          </p>
        )}
      </section>
    </div>
  );
}
