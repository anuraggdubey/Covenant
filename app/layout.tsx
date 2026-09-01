import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Covenant — Proof-Carrying Options Agent",
  description: "The proof-carrying options agent that compiles trader mandates into verified policy before execution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
