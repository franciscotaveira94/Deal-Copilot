import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { OverduePoller } from "@/components/overdue-poller";
import { CommandPalette } from "@/components/command-palette";
import { prisma } from "@/lib/db";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Deal Copilot",
  description: "A quiet place for your deals.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const accounts = await prisma.account.findMany({
    where: { status: "active" },
    orderBy: { lastTouch: "desc" },
    select: { id: true, name: true, stage: true },
  });

  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body style={{ fontFamily: "var(--font-sans)" }}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 relative">{children}</main>
        </div>
        <OverduePoller />
        <CommandPalette accounts={accounts} />
      </body>
    </html>
  );
}
