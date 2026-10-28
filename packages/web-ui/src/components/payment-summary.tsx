import type { ReactNode } from "react";
import { IndianRupee } from "lucide-react";

export function PaymentSummary({
  title,
  amount,
  amountLabel,
  testMode,
  children,
}: {
  title: string;
  amount: string;
  amountLabel: string;
  testMode?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="border-border bg-card overflow-hidden rounded-xl border"
    >
      <header className="bg-accent/50 space-y-3 px-4 py-4 sm:px-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <IndianRupee aria-hidden className="text-primary size-5" />
          {title}
        </h3>
        {testMode ? (
          <p className="text-muted-foreground text-xs">
            Test mode · No real money
          </p>
        ) : null}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-muted-foreground text-sm">{amountLabel}</p>
          <p className="text-xl font-semibold tabular-nums">{amount}</p>
        </div>
      </header>
      <div className="space-y-4 p-4 sm:p-5 [&_button]:h-auto [&_button]:min-h-11 [&_button]:whitespace-normal">
        {children}
      </div>
    </section>
  );
}

export function PaymentStatusLabel({ children }: { children: ReactNode }) {
  return (
    <span className="bg-accent text-accent-foreground inline-flex max-w-full rounded-md px-2.5 py-1.5 text-xs leading-5 font-medium [overflow-wrap:anywhere]">
      {children}
    </span>
  );
}
