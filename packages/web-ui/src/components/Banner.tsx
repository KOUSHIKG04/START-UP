import type { ReactNode } from "react";
import { gradients } from "@startup/design-tokens";
import { cn } from "cn";

export type BannerProps = {
  title?: string;
  subtitle?: string;
  className?: string;
  children?: ReactNode;
};

export function Banner({
  title = "Admin Dashboard",
  subtitle = "Startup Platform Operations & Analytics",
  className,
  children,
}: BannerProps) {
  return (
    <header
      className={cn(
        "rounded-2xl p-6 md:p-8 text-white shadow-lg bg-gradient-admin",
        className
      )}
      style={{ background: gradients.adminBanner.css }}
    >
      <h1 className="text-2xl font-bold m-0">{title}</h1>
      {subtitle && <p className="text-sm opacity-90 mt-1">{subtitle}</p>}
      {children}
    </header>
  );
}

// Alias for backwards-compatibility
// export const FlowBanner = Banner;
