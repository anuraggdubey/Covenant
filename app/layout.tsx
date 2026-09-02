import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { NoiseBg } from "@/components/NoiseBg";
import { ScrollProgress } from "@/components/ScrollProgress";
import { BackgroundOrbs } from "@/components/BackgroundOrbs";
import { VerticalGuides } from "@/components/VerticalGuides";
import { MarqueeTicker } from "@/components/MarqueeTicker";

export const metadata: Metadata = {
  title: "Covenant — Proof-Carrying Options Agent",
  description: "The proof-carrying options agent that compiles trader mandates into verified policy before execution.",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0a0a0a] text-white selection:bg-purple-500/30 antialiased min-h-screen flex flex-col relative overflow-x-hidden" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
        
        {/* §0 Global Shell Layers (back → front) */}
        {/* Layer 0: Background gradient orbs — deepest, behind everything */}
        <BackgroundOrbs />

        {/* Layer 1: Noise texture overlay — sits above orbs, blends with canvas */}
        <NoiseBg />

        {/* Layer 2: Vertical editorial guide lines */}
        <VerticalGuides />

        {/* Layer 3: Scroll progress bar — topmost fixed element */}
        <ScrollProgress />

        {/* Content layers */}
        <Navigation />
        <main className="flex-1 flex flex-col relative z-10">{children}</main>
      </body>
    </html>
  );
}

