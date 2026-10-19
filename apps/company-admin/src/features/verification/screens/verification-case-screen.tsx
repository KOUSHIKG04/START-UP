import { loadVerificationCase } from "../server/loadVerificationCase";
import { documentNames } from "../utils/documentConstants";
import type { CaseDetailProps } from "../types/case-detail";
import Link from "next/link";

import { formatDisplayDate, formatDisplayDateTime } from "@startup/contracts";

import { StatusBadge } from "../components/status-badge";
import { DocumentActions, FinalizeAction } from "../components/review-forms";

export default async function CaseDetail({ params }: CaseDetailProps) {
  const {
    id,
    item,
    facilityRequests,
    bedDeclaration,
    current,
    missingKinds,
    claimedQualification,
    qualificationApproved,
    allApproved,
    details,
  } = await loadVerificationCase({
    params,
  });
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
      {item.subject_type === "doctor" && (
        <section className="bg-card rounded-xl border p-5">
          <h2 className="font-semibold">Hospital / clinic association</h2>
          {facilityRequests.length ? (
            <ul className="mt-3 space-y-3 text-sm">
              {facilityRequests.map((request, index) => (
                <li
                  key={`${request.facility_name}-${index}`}
                  className="rounded-lg border p-3"
                >
                  <strong>{request.facility_name}</strong> ·{" "}
                  {request.facility_kind}
                  <p className="text-muted-foreground">
                    {request.facility_address}
                  </p>
                  <p>
                    Requested by {request.initiated_by}; facility decision:{" "}
                    {request.status}; practice{" "}
                    {request.practice_active ? "active" : "not active"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-2 text-sm">
              No registered facility request. A solo doctor may operate their
              own clinic after credential approval.
            </p>
          )}
        </section>
      )}
      {bedDeclaration && (
        <section className="bg-card rounded-xl border p-5">
          <h2 className="font-semibold">Declared bed services</h2>
          <p className="mt-2 text-sm">
            {bedDeclaration.offers_beds === null
              ? "Not declared by this existing facility"
              : bedDeclaration.offers_beds
                ? "Beds offered"
                : "Beds not offered"}
          </p>
          {bedDeclaration.bed_types.length > 0 && (
            <p className="text-muted-foreground mt-1 text-sm">
              {bedDeclaration.bed_types.join(", ")}
            </p>
          )}
        </section>
      )}
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
                  {formatDisplayDate(document.submitted_at, "Asia/Kolkata")}
                </p>
                {item.subject_type === "doctor" &&
                document.kind === "medical_degree" ? (
                  <p className="mt-2 text-sm">
                    Claimed qualifications:{" "}
                    <strong>
                      {claimedQualification || "Not submitted yet"}
                    </strong>
                  </p>
                ) : null}
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
              <DocumentActions
                caseId={id}
                documentId={document.id}
                approvalLabel={
                  document.kind === "medical_degree"
                    ? "Approve degree and qualifications"
                    : undefined
                }
                canApprove={
                  document.kind !== "medical_degree" ||
                  Boolean(claimedQualification)
                }
              />
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
            Every required document and the doctor's claimed qualifications must
            be reviewed before verification.
          </p>
          {allApproved ? (
            <FinalizeAction caseId={id} subjectType={item.subject_type} />
          ) : (
            <p className="text-muted-foreground text-sm">
              {item.subject_type === "doctor" && !claimedQualification
                ? "Awaiting the doctor's qualifications."
                : missingKinds.length
                  ? `Awaiting ${missingKinds.map((kind) => documentNames[kind] ?? kind.replaceAll("_", " ")).join(", ")}.`
                  : !qualificationApproved
                    ? "Review the claimed qualifications against the degree certificate."
                    : "Review all pending or rejected documents first."}
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
                  {formatDisplayDateTime(event.created_at, "Asia/Kolkata")}
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
