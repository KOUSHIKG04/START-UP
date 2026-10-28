import Link from "next/link";
import { IndianRupee } from "lucide-react";
import { appointmentMoney, payoutStatusLabel } from "@startup/contracts";
import { loadCompanyPayments } from "../server/loadPayments";
import { PaymentForm } from "../components/payment-form";
import { PaymentStatusLabel } from "@startup/web-ui/components/payment-summary";

import { paymentInputClass as inputClass } from "../utils/paymentConstants";

function Field({
  name,
  label,
  value,
  type = "text",
  required = true,
}: {
  name: string;
  label: string;
  value?: string | number;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      <input
        className={inputClass}
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        maxLength={1000}
      />
    </label>
  );
}

function Note() {
  return <Field name="note" label="Decision or receipt note" />;
}

export async function PaymentsScreen({ beforeId }: { beforeId?: string }) {
  const data = await loadCompanyPayments(beforeId);
  if (!data)
    return (
      <section className="mx-auto max-w-3xl space-y-3">
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p>
          Company finance access is required. Ask the account owner to grant
          finance access to your reviewer account.
        </p>
      </section>
    );
  const { setup, entries } = data;
  const cfg = setup.config;
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <IndianRupee aria-hidden className="size-6" />
          Payments & provider payouts
        </h1>
        <p className="text-muted-foreground max-w-3xl text-sm">
          {cfg.mode === "test" ? "Test mode · No real money." : "Live mode."}{" "}
          Company fees are shown before processing charges and taxes. Cash
          receipts record money already received by the company.
        </p>
      </header>
      <section
        aria-label="Payment ledger"
        className="bg-card overflow-hidden rounded-xl border"
      >
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Payment ledger</h2>
          <p className="text-muted-foreground text-sm">
            Latest 100 records on this page. Transfers and bank settlements have
            separate statuses.
          </p>
        </div>
        {!entries.length ? (
          <p className="p-5 text-sm">No payments are recorded yet.</p>
        ) : (
          <ul className="divide-y">
            {entries.map((e) => (
              <li key={e.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">
                      {e.recipient_name ?? "Recipient setup pending"}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {e.scope_kind === "practice"
                        ? "Consultation"
                        : "Ambulance"}{" "}
                      · Booking {e.resource_id.slice(-8)} ·{" "}
                      {e.method === "gateway" ? "Online" : "Collected directly"}{" "}
                      · {e.mode}
                    </p>
                  </div>
                  <PaymentStatusLabel>
                    {payoutStatusLabel(e)}
                  </PaymentStatusLabel>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm lg:grid-cols-4">
                  {[
                    ["Collected", appointmentMoney(e.gross_minor)],
                    ["Refunded", appointmentMoney(e.refunded_minor)],
                    [
                      "Company fee",
                      e.company_minor === null
                        ? "Not configured"
                        : appointmentMoney(e.company_minor),
                    ],
                    [
                      "Provider share",
                      e.provider_minor === null
                        ? "Not configured"
                        : appointmentMoney(e.provider_minor),
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="mt-1 font-semibold [overflow-wrap:anywhere] tabular-nums">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {e.transfer_id ? (
                  <p className="text-muted-foreground text-sm break-all">
                    Transfer {e.transfer_id}
                    {e.settlement_id
                      ? ` · Settlement ${e.settlement_id}`
                      : ""}{" "}
                    · Route fee {appointmentMoney(e.route_fees_minor)} · Route
                    tax {appointmentMoney(e.route_tax_minor)}
                  </p>
                ) : null}
                {(e.cash_credit_minor ?? 0) > 0 ? (
                  <p className="text-sm">
                    Company owes a cash commission adjustment of{" "}
                    {appointmentMoney(e.cash_credit_minor!)}. Reconcile it
                    separately.
                  </p>
                ) : null}
                <details>
                  <summary className="focus-visible:outline-ring cursor-pointer py-2 text-sm font-medium focus-visible:outline-2">
                    Manage this payment
                  </summary>
                  <div className="mt-2 max-w-lg space-y-4">
                    {e.commission_bps === null || !e.recipient_id ? (
                      <PaymentForm label="Apply current recipient and fee">
                        <input
                          type="hidden"
                          name="action"
                          value="apply_terms"
                        />
                        <input type="hidden" name="entryId" value={e.id} />
                        <p className="text-muted-foreground text-sm">
                          Apply the currently configured terms to this
                          previously unconfigured payment. Existing configured
                          payments keep their original terms.
                        </p>
                        <Note />
                      </PaymentForm>
                    ) : null}
                    {e.method === "gateway" ? (
                      <PaymentForm label="Check / process provider payment">
                        <input
                          type="hidden"
                          name="action"
                          value="process_payout"
                        />
                        <input type="hidden" name="entryId" value={e.id} />
                      </PaymentForm>
                    ) : e.complete && (e.cash_due_minor ?? 0) > 0 ? (
                      <PaymentForm
                        label={`Confirm company received ${appointmentMoney(e.cash_due_minor!)}`}
                      >
                        <input
                          type="hidden"
                          name="action"
                          value="cash_receipt"
                        />
                        <input type="hidden" name="entryId" value={e.id} />
                        <input
                          type="hidden"
                          name="expectedAmount"
                          value={e.cash_due_minor!}
                        />
                        <Field
                          name="reference"
                          label="Unique bank / receipt reference"
                        />
                        <Note />
                      </PaymentForm>
                    ) : null}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-4 border-t px-5 py-3 text-sm">
          <Link href="/payments" className="underline underline-offset-4">
            Latest records
          </Link>
          {entries.length === 100 ? (
            <Link
              href={`/payments?before=${entries.at(-1)!.id}`}
              className="underline underline-offset-4"
            >
              Older records
            </Link>
          ) : null}
        </div>
      </section>
      <section className="grid items-start gap-8 xl:grid-cols-2">
        <div className="bg-card space-y-5 rounded-xl border p-4 sm:p-6">
          <h2 className="text-lg font-semibold">
            Commission & release settings
          </h2>
          <PaymentForm label="Save payment settings">
            <input type="hidden" name="action" value="config" />
            <input
              type="hidden"
              name="expectedVersion"
              value={cfg.row_version}
            />
            <label className="bg-accent/50 flex min-h-12 items-center gap-3 rounded-lg p-3 text-sm">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={cfg.enabled}
              />
              Enable ambulance billing and provider transfer eligibility
            </label>
            <label className="block space-y-1 text-sm">
              Gateway environment
              <select
                className={inputClass}
                name="mode"
                defaultValue={cfg.mode}
              >
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                name="appointmentBps"
                label="Consultation company fee (%)"
                value={
                  cfg.appointment_bps === null ? "" : cfg.appointment_bps / 100
                }
                required={false}
              />
              <Field
                name="ambulanceBps"
                label="Ambulance company fee (%)"
                value={
                  cfg.ambulance_bps === null ? "" : cfg.ambulance_bps / 100
                }
                required={false}
              />
            </div>
            <p className="text-muted-foreground text-sm">
              Blank means unconfigured. Enter 0 explicitly for no commission.
              Changes apply to future captured payments; configured entries
              retain their terms.
            </p>
            <Field
              name="releaseDelayHours"
              label="Hours after service completion (0–168)"
              value={cfg.release_delay_hours}
              type="number"
            />
            <Note />
          </PaymentForm>
        </div>
        <div className="bg-card space-y-5 rounded-xl border p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Link a payout recipient</h2>
          <p className="text-muted-foreground text-sm">
            Complete recipient KYC, settlement details and Route activation in
            Razorpay first. Confirm the legal recipient and service agreement
            before linking it here. Bank details stay in Razorpay.
          </p>
          <PaymentForm label="Save recipient for verification">
            <input type="hidden" name="action" value="recipient" />
            <label className="block space-y-1 text-sm">
              Provider scope
              <select name="scopeKind" className={inputClass}>
                <option value="practice">Doctor practice</option>
                <option value="driver">Driver service</option>
              </select>
            </label>
            <Field name="scopeId" label="Practice / driver UUID" />
            <label className="block space-y-1 text-sm">
              Legal recipient type
              <select name="payeeKind" className={inputClass}>
                <option value="doctor">Independent doctor</option>
                <option value="facility">Facility</option>
                <option value="driver">Independent driver</option>
                <option value="operator">Ambulance operator</option>
              </select>
            </label>
            <Field name="legalName" label="Legal recipient name" />
            <Field name="accountId" label="Razorpay Linked Account ID" />
            <Field name="productId" label="Route product configuration ID" />
            <Note />
          </PaymentForm>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Linked recipients</h2>
        {!setup.recipients.length ? (
          <p className="text-muted-foreground text-sm">No recipients linked.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {setup.recipients.map((r) => (
              <li key={r.id} className="space-y-2 p-4">
                <p className="font-medium">
                  {r.legal_name} · {r.payee_kind} · {r.mode}
                </p>
                <p className="text-muted-foreground text-sm break-all">
                  {r.scope_kind}: {r.scope_id} · {r.account_id}
                </p>
                <p className="text-sm">
                  {r.verified_at
                    ? "Route activation verified"
                    : "Activation verification needed"}
                </p>
                <PaymentForm label="Verify Route activation">
                  <input type="hidden" name="action" value="verify_recipient" />
                  <input type="hidden" name="recipientId" value={r.id} />
                </PaymentForm>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="bg-card max-w-xl space-y-4 rounded-xl border p-4 sm:p-6">
        <h2 className="text-lg font-semibold">
          Record an ambulance final fare
        </h2>
        <p className="text-muted-foreground text-sm">
          For a completed trip with no payment in progress. Use the agreed fare;
          this does not charge the patient automatically.
        </p>
        <PaymentForm label="Save final fare">
          <input type="hidden" name="action" value="final_fare" />
          <Field name="bookingId" label="Ambulance booking UUID" />
          <Field name="amount" label="Agreed final fare (₹)" />
          <Note />
        </PaymentForm>
      </section>
    </div>
  );
}
