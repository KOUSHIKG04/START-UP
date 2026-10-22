import type { Metadata } from "next";
import localFont from "next/font/local";
import { TooltipProvider } from "@startup/web-ui/components/ui/tooltip";
import { Toaster } from "@startup/web-ui/components/ui/toast";
import { QueryProvider } from "@/providers/QueryProvider";
import "./globals.css";

const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [
    {
      path: "../../../../packages/design-tokens/assets/fonts/Inter_400Regular.ttf",
      weight: "400",
    },
    {
      path: "../../../../packages/design-tokens/assets/fonts/Inter_500Medium.ttf",
      weight: "500",
    },
    {
      path: "../../../../packages/design-tokens/assets/fonts/Inter_600SemiBold.ttf",
      weight: "600",
    },
    {
      path: "../../../../packages/design-tokens/assets/fonts/Inter_700Bold.ttf",
      weight: "700",
    },
  ],
});

export const metadata: Metadata = {
  title: "Clinzo Company Admin",
  description: "Internal credential and document verification",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans" suppressHydrationWarning>
        <QueryProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster timeout={12000} />
        </QueryProvider>
      </body>
    </html>
  );
}
