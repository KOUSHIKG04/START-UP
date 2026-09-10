import type { ReactNode } from "react";
import { cn } from "cn";

export type PageShellProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
};

export function PageShell({
  children,
  className,
  containerClassName,
}: PageShellProps) {
  return (
    <main
      className={cn(
        "bg-admin-bg text-admin-text min-h-screen p-4 md:p-8",
        className
      )}
    >
      <section
        className={cn(
          "mx-auto max-w-5xl bg-white p-6 md:p-8",
          containerClassName
        )}
      >
        {children}
      </section>
    </main>
  );
}
