import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@startup/web-ui/components/ui/tooltip";
import { Toaster } from "@startup/web-ui/components/ui/toast";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";

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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hospital and Clinic Portal",
  description:
    "Hospital administration, bed management, and appointment operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col font-sans"
        suppressHydrationWarning
      >
        <QueryProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster timeout={12000} />
        </QueryProvider>
      </body>
    </html>
  );
}
