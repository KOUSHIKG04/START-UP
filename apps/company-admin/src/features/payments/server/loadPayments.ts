import "server-only";
import {
  getCompanyPaymentSetup,
  hasCompanyFinanceAccess,
  listPayoutEntries,
} from "@startup/data-access";
import { requireReviewer } from "@/lib/reviewer";

export async function loadCompanyPayments(beforeId?: string) {
  const client = await requireReviewer();
  if (!(await hasCompanyFinanceAccess(client))) return null;
  const [setup, entries] = await Promise.all([
    getCompanyPaymentSetup(client),
    listPayoutEntries(client, { beforeId }),
  ]);
  return { setup, entries };
}
