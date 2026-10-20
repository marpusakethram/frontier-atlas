import type { Metadata } from "next";
import "./globals.css";
import { TerminalShell } from "@/components/layout/TerminalShell";

export const metadata: Metadata = {
  title: "Frontier Atlas — Deep-Tech Investment Intelligence Platform",
  description:
    "Discover the technological inflection points that create tomorrow's companies. Institutional research terminal for frontier venture capital.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0B0F14] text-[#F1F5F9] antialiased">
        <TerminalShell>{children}</TerminalShell>
      </body>
    </html>
  );
}
