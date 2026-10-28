"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import {
  hasCompanyFinanceAccess,
  manageCompanyPayments,
  processFinanceGatewayAction,
} from "@startup/data-access";
import { requireReviewer } from "@/lib/reviewer";

function decimalMinor(
  value: FormDataEntryValue | null,
  empty: boolean = false
) {
  const text = String(value ?? "").trim();
  if (empty && !text) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(text))
    throw new Error("Use a positive amount with up to two decimal places.");
  const [whole, fraction = ""] = text.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount)) throw new Error("Amount is too large.");
  return amount;
}

export async function changeCompanyPayments(
  _previous: { error: string; success: string },
  form: FormData
) {
  const client = await requireReviewer();
  try {
    if (!(await hasCompanyFinanceAccess(client)))
      return { error: "Company finance access is required.", success: "" };
    const action = String(form.get("action"));
    const note = String(form.get("note") ?? "");
    if (action === "config")
      await manageCompanyPayments(client, {
        action,
        note,
        enabled: form.get("enabled") === "on",
        mode: form.get("mode"),
        appointmentBps: decimalMinor(form.get("appointmentBps"), true),
        ambulanceBps: decimalMinor(form.get("ambulanceBps"), true),
        releaseDelayHours: Number(form.get("releaseDelayHours")),
        expectedVersion: Number(form.get("expectedVersion")),
      });
    else if (action === "recipient")
      await manageCompanyPayments(client, {
        action,
        note,
        scopeKind: form.get("scopeKind"),
        scopeId: form.get("scopeId"),
        payeeKind: form.get("payeeKind"),
        legalName: form.get("legalName"),
        accountId: form.get("accountId"),
        productId: form.get("productId"),
      });
    else if (action === "final_fare")
      await manageCompanyPayments(client, {
        action,
        note,
        bookingId: form.get("bookingId"),
        amountMinor: decimalMinor(form.get("amount")),
      });
    else if (action === "cash_receipt")
      await manageCompanyPayments(client, {
        action,
        note,
        entryId: form.get("entryId"),
        expectedAmount: Number(form.get("expectedAmount")),
        reference: form.get("reference"),
      });
    else if (action === "apply_terms")
      await manageCompanyPayments(client, {
        action,
        note,
        entryId: form.get("entryId"),
      });
    else if (action === "verify_recipient")
      await processFinanceGatewayAction(client, {
        resourceType: "finance",
        action,
        recipientId: form.get("recipientId"),
      });
    else if (action === "process_payout")
      await processFinanceGatewayAction(client, {
        resourceType: "finance",
        action,
        entryId: form.get("entryId"),
      });
    else return { error: "Unknown financial action.", success: "" };
    revalidatePath("/payments");
    return {
      error: "",
      success:
        action === "process_payout"
          ? "Provider status checked. Review the current ledger status."
          : "Saved. The latest payment records are shown below.",
    };
  } catch (error) {
    unstable_rethrow(error);
    const code = (error as { code?: string })?.code;
    return {
      error:
        code === "PT409"
          ? "Payment details changed. Reload this page before retrying."
          : code === "42501"
            ? "Company finance access is required."
            : "Could not complete this action. Check the values and refresh payment status before retrying.",
      success: "",
    };
  }
}
