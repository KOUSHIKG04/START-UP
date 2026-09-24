import type { Metadata } from "next";
import { Albert_Sans, Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@startup/web-ui/components/ui/tooltip";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";

const albertSans = Albert_Sans({
  variable: "--font-albert-sans",
  subsets: ["latin"],
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
      className={`${albertSans.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col font-sans"
        suppressHydrationWarning
      >
        <QueryProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
